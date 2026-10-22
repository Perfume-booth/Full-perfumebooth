from django.conf import settings
from rest_framework.exceptions import ValidationError
from .models import ProviderSnapshot, ProviderSync
from .providers import REQUIRED, ACCOUNT, missing

COLUMNS = {
    'ga4': ['Source / medium', 'Sessions', 'Active users', 'Engaged sessions', 'Provider key events'],
    'search_console': ['Query', 'Page', 'Device', 'Clicks', 'Impressions', 'CTR fraction', 'Average position'],
    'google_ads': ['Campaign ID', 'Campaign', 'Currency', 'Spend', 'Clicks', 'Impressions', 'Timezone'],
    'meta_ads': ['Campaign ID', 'Campaign', 'Currency', 'Spend', 'Clicks', 'Impressions', 'Timezone'],
}


def provider_report(key, start, end):
    if key == 'analytics-sources':
        rows = [['first_party', 'enabled' if settings.FIRST_PARTY_ANALYTICS_ENABLED else 'disabled', '', None]]
        for provider in REQUIRED:
            state = ProviderSync.objects.filter(pk=provider).first()
            absent = missing(provider)
            rows.append([provider, 'needs_credentials' if absent else state.status if state else 'awaiting_sync',
                         ', '.join(absent), state.last_success.isoformat() if state and state.last_success else None])
        return ['Source', 'State', 'Missing configuration keys (not secret values)', 'Last successful sync'], rows, ['Configuration presence does not prove permissions, token validity or successful API access.'], 'ready', None
    provider = key.removeprefix('external-')
    absent = missing(provider)
    state = ProviderSync.objects.filter(pk=provider).first()
    snapshots = ProviderSnapshot.objects.filter(provider=provider, account=settings.ANALYTICS_INTEGRATIONS.get(ACCOUNT[provider], ''),
        day__gte=start.date(), day__lte=end.date()).order_by('day')
    rows = []
    for snapshot in snapshots:
        rows.extend([[snapshot.day.isoformat(), *row, snapshot.fetched_at.isoformat()] for row in snapshot.rows])
        if len(rows) > 25000:
            raise ValidationError('Provider report exceeds 25,000 rows. Narrow the date range.')
    status = 'needs_credentials' if absent else 'sync_failed' if state and state.status == 'sync_failed' else 'ready' if snapshots.exists() else 'awaiting_data'
    notes = ['External provider observations, not Django financial truth. Metrics are not combined across providers or currencies.',
             'Provider timezone/date basis is preserved, not converted to Asia/Kolkata. Current-day data is not scheduled; refresh covers the preceding four dates.',
             'GA4 may apply modeling, sampling, thresholding or aggregation; these are provider-reported metrics, not verified individual events. Key events are NOT verified orders.',
             'Search Console returns top rows and excludes some anonymized queries; it does not guarantee complete coverage. Dates follow Search Console Pacific time.',
             'Ad spend is in the source account currency. No currency conversion or inferred ROAS is applied.',
             'Missing dates are gaps, not zero spend or zero traffic. A failed sync preserves the last successful snapshot.']
    if absent:
        notes.append('Required server configuration: '+', '.join(absent))
    return ['Provider date', *COLUMNS[provider], 'Fetched at'], rows, notes, status, None
