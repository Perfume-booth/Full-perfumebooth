"""Read-only connectors. Tokens stay in server configuration; errors never expose them."""
from datetime import date
from decimal import Decimal
import re
from urllib.parse import quote
import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import ProviderSnapshot, ProviderSync

REQUIRED = {
    'ga4': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GA4_PROPERTY_ID'],
    'search_console': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'SEARCH_CONSOLE_SITE'],
    'google_ads': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_API_VERSION'],
    'meta_ads': ['META_ADS_ACCESS_TOKEN', 'META_ADS_ACCOUNT_ID', 'META_ADS_API_VERSION'],
}
ACCOUNT = {'ga4': 'GA4_PROPERTY_ID', 'search_console': 'SEARCH_CONSOLE_SITE', 'google_ads': 'GOOGLE_ADS_CUSTOMER_ID', 'meta_ads': 'META_ADS_ACCOUNT_ID'}


def missing(provider):
    return [key for key in REQUIRED[provider] if not settings.ANALYTICS_INTEGRATIONS.get(key)]


def request_json(method, url, **kwargs):
    response = requests.request(method, url, timeout=(5, 30), **kwargs)
    response.raise_for_status()
    return response.json()


def fetch_rows(provider, day):
    day = date.fromisoformat(str(day)).isoformat()
    cfg = settings.ANALYTICS_INTEGRATIONS
    if missing(provider):
        raise ValueError('Missing provider configuration')
    if provider == 'meta_ads':
        token = cfg['META_ADS_ACCESS_TOKEN']
    else:
        token = request_json('POST', 'https://oauth2.googleapis.com/token', data={
            'client_id': cfg['GOOGLE_CLIENT_ID'], 'client_secret': cfg['GOOGLE_CLIENT_SECRET'],
            'refresh_token': cfg['GOOGLE_REFRESH_TOKEN'], 'grant_type': 'refresh_token'})['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    account = cfg[ACCOUNT[provider]]
    rows, cursor = [], None
    if provider != 'search_console' and not re.fullmatch(r'\d+', account):
        raise ValueError('Account identifier must contain digits only')
    if provider in ['google_ads', 'meta_ads']:
        version = cfg['GOOGLE_ADS_API_VERSION' if provider == 'google_ads' else 'META_ADS_API_VERSION']
        if not re.fullmatch(r'v\d+(\.\d+)?', version):
            raise ValueError('Invalid API version')
    meta_timezone = ''
    if provider == 'meta_ads':
        meta_timezone = request_json('GET', f'https://graph.facebook.com/{version}/act_{account}', headers=headers,
                                    params={'fields': 'timezone_name'})['timezone_name']
    for page in range(10):
        if provider == 'ga4':
            data = request_json('POST', f'https://analyticsdata.googleapis.com/v1beta/properties/{account}:runReport', headers=headers,
                json={'dateRanges': [{'startDate': day, 'endDate': day}], 'dimensions': [{'name': 'sessionSourceMedium'}],
                      'metrics': [{'name': n} for n in ['sessions', 'activeUsers', 'engagedSessions', 'keyEvents']], 'offset': str(page*10000), 'limit': '10000'})
            for r in data.get('rows', []):
                rows.append([r['dimensionValues'][0]['value'], *[v['value'] for v in r['metricValues']]])
            if len(rows) >= int(data.get('rowCount', 0)):
                return account, rows
        elif provider == 'search_console':
            data = request_json('POST', f'https://www.googleapis.com/webmasters/v3/sites/{quote(account, safe="")}/searchAnalytics/query', headers=headers,
                json={'startDate': day, 'endDate': day, 'dimensions': ['query', 'page', 'device'], 'dataState': 'final', 'rowLimit': 10000, 'startRow': page*10000})
            batch = data.get('rows', [])
            rows.extend([[*r['keys'], r['clicks'], r['impressions'], r['ctr'], r['position']] for r in batch])
            if len(batch) < 10000:
                return account, rows
        elif provider == 'google_ads':
            headers['developer-token'] = cfg['GOOGLE_ADS_DEVELOPER_TOKEN']
            if cfg.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID'):
                headers['login-customer-id'] = cfg['GOOGLE_ADS_LOGIN_CUSTOMER_ID']
            body = {'query': f"SELECT campaign.id, campaign.name, customer.currency_code, customer.time_zone, metrics.cost_micros, metrics.clicks, metrics.impressions FROM campaign WHERE segments.date = '{day}'"}
            if cursor:
                body['pageToken'] = cursor
            data = request_json('POST', f'https://googleads.googleapis.com/{version}/customers/{account}/googleAds:search', headers=headers, json=body)
            for r in data.get('results', []):
                m = r['metrics']
                rows.append([str(r['campaign']['id']), r['campaign']['name'], r['customer']['currencyCode'],
                             str(Decimal(m.get('costMicros', 0))/1000000), int(m.get('clicks', 0)), int(m.get('impressions', 0)), r['customer']['timeZone']])
            cursor = data.get('nextPageToken')
            if not cursor:
                return account, rows
        else:
            params = {'time_range': '{"since":"'+day+'","until":"'+day+'"}', 'level': 'campaign', 'limit': 1000,
                      'fields': 'campaign_id,campaign_name,account_currency,spend,clicks,impressions'}
            if cursor:
                params['after'] = cursor
            data = request_json('GET', f'https://graph.facebook.com/{version}/act_{account}/insights', headers=headers, params=params)
            rows.extend([[r['campaign_id'], r['campaign_name'], r['account_currency'], str(Decimal(r['spend'])), int(r.get('clicks', 0)), int(r.get('impressions', 0)), meta_timezone] for r in data.get('data', [])])
            paging = data.get('paging', {})
            if not paging.get('next'):
                return account, rows
            cursor = paging.get('cursors', {}).get('after')
            if not cursor:
                raise ValueError('Missing pagination cursor')
    raise ValueError('Provider result exceeds bounded sync size; no partial snapshot saved')


def sync_day(provider, day):
    if provider not in REQUIRED:
        raise ValueError('Unknown provider')
    state, _ = ProviderSync.objects.get_or_create(provider=provider)
    state.last_attempt = timezone.now()
    state.status = 'needs_credentials' if missing(provider) else 'syncing'
    state.save()
    if missing(provider):
        return False
    try:
        account, rows = fetch_rows(provider, day)
        with transaction.atomic():
            ProviderSnapshot.objects.update_or_create(provider=provider, account=account, day=day, defaults={'rows': rows})
            ProviderSync.objects.filter(pk=provider).update(status='ready', last_success=timezone.now())
        return True
    except (requests.RequestException, ValueError, KeyError, TypeError, ArithmeticError):
        # Never save exception text: request URLs/headers may contain credentials.
        ProviderSync.objects.filter(pk=provider).update(status='sync_failed')
        return False
