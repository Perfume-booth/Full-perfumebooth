import hashlib
import hmac
import json
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from apps.orders.models import Order, PaymentTransaction
from apps.orders.payment_ledger import record_capture, record_refund
from apps.shop.report_catalog import report_data, TZ


@override_settings(RAZORPAY_WEBHOOK_SECRET='ledger-secret')
class LedgerTests(TestCase):
    def setUp(self):
        self.order = Order.objects.create(order_number='LEDGER', subtotal=100, total=100,
            payment_method='RAZORPAY', payment_status='Paid', status='Delivered', payment_intent_id='pay_ledger')
        self.entity = {'id': 'pay_ledger', 'amount': 10000, 'currency': 'INR', 'method': 'upi'}
        record_capture(self.order, self.entity)

    def refund(self, **changes):
        return {'id': 'rfnd_1', 'payment_id': 'pay_ledger', 'amount': 2500, 'currency': 'INR', 'status': 'processed', **changes}

    def test_capture_and_refund_idempotency(self):
        record_capture(self.order, self.entity)
        record_refund(self.refund())
        record_refund(self.refund())
        self.assertEqual(PaymentTransaction.objects.count(), 2)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'Partially Refunded')
        self.assertEqual(self.order.status, 'Delivered')
        record_refund(self.refund(id='rfnd_2', amount=7500))
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'Refunded')
        self.assertEqual(self.order.status, 'Delivered')

    def test_invalid_or_conflicting_refunds_roll_back(self):
        record_refund(self.refund())
        for data in [self.refund(amount=2501), self.refund(id='rfnd_2', amount=8000),
                     self.refund(id='rfnd_2', amount=True), self.refund(currency='USD'),
                     self.refund(payment_id='pay_missing'), self.refund(status='pending')]:
            with self.assertRaises(ValidationError):
                record_refund(data)
        self.assertEqual(PaymentTransaction.objects.filter(kind='refund').count(), 1)

    def test_reports_use_movement_dates_not_order_dates(self):
        Order.objects.filter(pk=self.order.pk).update(created_at=timezone.now()-timedelta(days=100))
        record_refund(self.refund())
        now = timezone.now()+timedelta(seconds=1)
        day = now.astimezone(TZ).date().isoformat()
        params = {'start': day, 'end': day}
        rows = report_data('finance-payments', params, now)['rows']
        self.assertEqual(rows, [['razorpay', 'upi', 1, '100.00', 1, '25.00', '75.00']])
        rows = report_data('finance-refunds', params, now)['rows']
        self.assertEqual(rows[0][5], '25.00')

    def test_refund_endpoint_requires_signature_and_deduplicates(self):
        payload = json.dumps({'event': 'refund.processed', 'created_at': int(timezone.now().timestamp()),
                              'payload': {'refund': {'entity': self.refund()}}})
        client = APIClient()
        url = '/api/orders/webhooks/razorpay/'
        self.assertEqual(client.post(url, payload, content_type='application/json').status_code, 400)
        signature = hmac.new(b'ledger-secret', payload.encode(), hashlib.sha256).hexdigest()
        for _ in range(2):
            response = client.post(url, payload, content_type='application/json', HTTP_X_RAZORPAY_SIGNATURE=signature)
            self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(PaymentTransaction.objects.filter(kind='refund').count(), 1)
        self.assertEqual(PaymentTransaction.objects.get(kind='refund').time_basis, 'provider_event')
