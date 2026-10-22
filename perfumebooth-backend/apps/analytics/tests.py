import uuid
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from apps.orders.models import Order
from apps.shop.report_catalog import report_data, TZ
from .models import Event, OrderAttribution, ProviderSnapshot
from .ingestion import accept, attach_order
from .tasks import process_pending_events
from .providers import sync_day, fetch_rows, REQUIRED


@override_settings(FIRST_PARTY_ANALYTICS_ENABLED=True, ANALYTICS_INGEST_KEY='test-ingest')
class AnalyticsTests(TestCase):
    def setUp(self):
        self.sid, self.vid = uuid.uuid4(), uuid.uuid4()

    def payload(self, **kw):
        return {'id': str(uuid.uuid4()), 'session_id': str(self.sid), 'visitor_id': str(self.vid),
                'name': 'page_view', 'path': '/', 'consent': True, 'consent_version': '2026-10-v1', 'properties': {}, **kw}

    def report(self, key):
        now = timezone.now()+timedelta(seconds=1)
        day = now.astimezone(TZ).date().isoformat()
        return report_data(key, {'start': day, 'end': day}, now)

    def test_consent_validation_idempotency_and_no_financial_events(self):
        data = self.payload()
        accept(data)
        accept(data)
        self.assertEqual(Event.objects.count(), 1)
        for changes in [{'consent': False}, {'name': 'purchase'}, {'properties': {'revenue': 500}},
                        {'path': '/?email=private@example.test'}, {'name': 'web_vital', 'properties': {'metric': 'CLS', 'metric_id': 'id', 'value': float('nan')}}]:
            with self.assertRaises(ValidationError):
                accept(self.payload(**changes))
        with self.assertRaises(ValidationError):
            accept({**data, 'path': '/products'})

    def test_async_inbox_and_readiness(self):
        accept(self.payload())
        self.assertEqual(self.report('sessions-time')['data_state'], 'awaiting_data')
        self.assertEqual(process_pending_events(), 1)
        self.assertEqual(process_pending_events(), 0)
        self.assertEqual(self.report('sessions-time')['rows'][0][1:], [1, 1])

    def test_signed_attribution_and_verified_paid_conversion(self):
        event, token = accept(self.payload())
        order = Order.objects.create(order_number='ANALYTICS', subtotal=100, total=100, payment_status='Pending')
        attach_order(order, 'invalid')
        self.assertFalse(OrderAttribution.objects.exists())
        attach_order(order, token)
        attach_order(order, token)
        process_pending_events()
        self.assertEqual(self.report('conversion')['rows'][-1], ['verified_paid_order', 0])
        order.payment_status = 'Paid'
        order.save()
        self.assertEqual(self.report('conversion')['rows'][-1], ['verified_paid_order', 1])

    def test_search_clicks_and_vitals_latest_observation(self):
        accept(self.payload(name='search', properties={'query': 'oud', 'search_id': 'search1', 'result_count': 0}))
        accept(self.payload(name='search_click', properties={'search_id': 'search1', 'product_id': 'p'}))
        for value in [1000, 2000]:
            accept(self.payload(name='web_vital', properties={'metric': 'LCP', 'metric_id': 'load1', 'value': value}))
        process_pending_events()
        self.assertEqual(self.report('search-queries')['rows'][0][1:4], [1, 1, 0])
        self.assertEqual(self.report('vitals-lcp-url')['rows'], [['/', 1, 2000]])

    def test_public_endpoint_disabled_and_malformed(self):
        client = APIClient()
        self.assertEqual(client.post('/api/shop/events/', self.payload(), format='json').status_code, 403)
        client.credentials(HTTP_X_ANALYTICS_KEY='test-ingest')
        with override_settings(FIRST_PARTY_ANALYTICS_ENABLED=False):
            self.assertEqual(client.post('/api/shop/events/', self.payload(), format='json').status_code, 503)
        self.assertEqual(client.post('/api/shop/events/', self.payload(), format='json').status_code, 202)
        self.assertEqual(client.post('/api/shop/events/', {'consent': False}, format='json').status_code, 400)

    def test_known_pii_redaction(self):
        event, _ = accept(self.payload(name='search', properties={'query': 'x@example.test 9999999999', 'search_id': 's', 'result_count': 0}))
        self.assertEqual(event.properties['query'], '[redacted] [redacted]')

    def test_observed_roas_requires_spend_coverage_and_refund_allocation(self):
        now = timezone.now()+timedelta(seconds=1)
        day = now.astimezone(TZ).date()
        event, token = accept(self.payload(properties={'utm_source': 'google', 'utm_campaign': '42'}))
        order = Order.objects.create(order_number='CAMPAIGN', subtotal=100, discount_amount=10, total=100, payment_status='Paid')
        attach_order(order, token)
        process_pending_events()
        ProviderSnapshot.objects.create(provider='google_ads', account='1', day=day,
            rows=[['42', 'Campaign', 'INR', '30', 1, 10, 'Asia/Kolkata']])
        with override_settings(ANALYTICS_INTEGRATIONS={'GOOGLE_ADS_CUSTOMER_ID': '1'}):
            self.assertEqual(self.report('campaigns')['rows'][0][4:7], ['90.00', '30', '3.0000'])
            order.payment_status = 'Partially Refunded'
            order.save()
            self.assertIsNone(self.report('campaigns')['rows'][0][6])

    def test_checkout_continues_when_optional_attribution_storage_fails(self):
        from django.db import DatabaseError
        _, token = accept(self.payload())
        order = Order.objects.create(order_number='FAILOPEN', subtotal=100, total=100)
        with patch('apps.analytics.ingestion.OrderAttribution.objects.get_or_create', side_effect=DatabaseError('unavailable')):
            attach_order(order, token)
        self.assertTrue(Order.objects.filter(pk=order.pk).exists())

    def test_out_of_order_vital_updates_use_client_revision(self):
        for revision, value in [(2, 150), (1, 200)]:
            accept(self.payload(name='web_vital', properties={'metric': 'INP', 'metric_id': 'load', 'value': value, 'metric_revision': revision}))
        process_pending_events()
        self.assertEqual(self.report('vitals-inp-url')['rows'], [['/', 1, 150]])


class ProviderTests(TestCase):
    def config(self, provider):
        values = {key: 'configured' for key in REQUIRED[provider]}
        values.update(GA4_PROPERTY_ID='123', GOOGLE_ADS_CUSTOMER_ID='456', GOOGLE_ADS_API_VERSION='v22', META_ADS_ACCOUNT_ID='123', META_ADS_API_VERSION='v24.0')
        return values

    @patch('apps.analytics.providers.fetch_rows')
    def test_sync_replaces_not_adds_and_failure_preserves_last_success(self, fetch):
        fetch.return_value = ('123', [['direct', '10', '8', '5', '1']])
        with override_settings(ANALYTICS_INTEGRATIONS=self.config('ga4')):
            self.assertTrue(sync_day('ga4', '2026-10-20'))
            self.assertTrue(sync_day('ga4', '2026-10-20'))
            self.assertEqual(ProviderSnapshot.objects.count(), 1)
            fetch.side_effect = ValueError('secret must not appear in stored status')
            self.assertFalse(sync_day('ga4', '2026-10-20'))
            self.assertEqual(ProviderSnapshot.objects.count(), 1)

    @patch('apps.analytics.providers.request_json')
    def test_provider_response_contracts(self, request):
        samples = {
            'ga4': ({'rowCount': 1, 'rows': [{'dimensionValues': [{'value': 'direct'}], 'metricValues': [{'value': str(n)} for n in [1, 2, 3, 4]]}]}, ['direct', '1', '2', '3', '4']),
            'search_console': ({'rows': [{'keys': ['oud', 'https://example.test/', 'MOBILE'], 'clicks': 1, 'impressions': 10, 'ctr': .1, 'position': 3}]}, ['oud', 'https://example.test/', 'MOBILE', 1, 10, .1, 3]),
            'google_ads': ({'results': [{'campaign': {'id': '1', 'name': 'Campaign'}, 'customer': {'currencyCode': 'INR', 'timeZone': 'Asia/Kolkata'}, 'metrics': {'costMicros': '2500000', 'clicks': '1', 'impressions': '10'}}]}, ['1', 'Campaign', 'INR', '2.5', 1, 10, 'Asia/Kolkata']),
            'meta_ads': ({'data': [{'campaign_id': '1', 'campaign_name': 'Campaign', 'account_currency': 'INR', 'spend': '2.50', 'clicks': '1', 'impressions': '10'}]}, ['1', 'Campaign', 'INR', '2.50', 1, 10, 'Asia/Kolkata']),
        }
        for provider, (response, expected) in samples.items():
            request.side_effect = [{'timezone_name': 'Asia/Kolkata'}, response] if provider == 'meta_ads' else [{'access_token': 'secret'}, response]
            with override_settings(ANALYTICS_INTEGRATIONS=self.config(provider)):
                _, rows = fetch_rows(provider, '2026-10-20')
                self.assertEqual(rows, [expected])
