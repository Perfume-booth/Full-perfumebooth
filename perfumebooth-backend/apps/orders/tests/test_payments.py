import hashlib
import hmac
import json
import uuid
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, TransactionTestCase, override_settings, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.test import APIClient

from apps.checkout.services.checkout_service import CheckoutService
from apps.checkout.validators import CartItemInput, CheckoutInput
from apps.inventory.services import InventoryReservationService
from apps.orders.models import Order, PaymentAttempt, PaymentEvent, PaymentOutbox
from apps.orders.payments import initialize, process_entity, verify, reconcile
from apps.orders.tasks import process_payment_outbox
from apps.shop.models import Product, Inventory


@override_settings(RAZORPAY_KEY_ID='test_key', RAZORPAY_KEY_SECRET='test_secret', RAZORPAY_WEBHOOK_SECRET='webhook_secret')
class PaymentTests(TestCase):
    def setUp(self):
        product = Product.objects.create(title='Payment test', slug='payment-test', sku='PAY1', price=Decimal('500'))
        self.inventory = Inventory.objects.create(product=product, stock_level=20)
        self.input = CheckoutInput(items=[CartItemInput(str(product.pk), 1)], shipping_address={
            'first_name': 'Test', 'last_name': 'Buyer', 'address1': '123 Road', 'city': 'Mumbai',
            'state': 'MH', 'zip': '400001', 'country_code': 'IN', 'phone': '9999999999', 'email': 'buyer@example.com',
        }, payment_method='RAZORPAY', coupon_code='')
        self.key = str(uuid.uuid4())

    def order(self):
        result = CheckoutService.idempotent_checkout(None, self.input, self.key)
        order = Order.objects.get(pk=result['order_id'])
        PaymentAttempt.objects.get_or_create(order=order, defaults={'gateway_order_id': 'order_test', 'status': 'ready'})
        return order

    def entity(self, order, **changes):
        return {'id': 'pay_test', 'order_id': 'order_test', 'amount': int(order.total * 100), 'currency': 'INR', 'status': 'captured', **changes}

    def test_retry_reuses_order_and_reservation(self):
        first = CheckoutService.idempotent_checkout(None, self.input, self.key)
        second = CheckoutService.idempotent_checkout(None, self.input, self.key)
        self.assertEqual(first, second)
        self.assertEqual(Order.objects.count(), 1)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.reserved_stock, 1)

    def test_key_payload_conflict(self):
        self.order()
        self.input.items[0].quantity = 2
        with self.assertRaises(APIException) as caught:
            CheckoutService.idempotent_checkout(None, self.input, self.key)
        self.assertEqual(caught.exception.status_code, 409)

    def test_key_required(self):
        with self.assertRaises(ValidationError):
            CheckoutService.idempotent_checkout(None, self.input, None)

    def test_duplicate_capture_has_one_set_of_effects(self):
        order = self.order()
        entity = self.entity(order)
        process_entity(entity, 'event1', 'payment.captured')
        process_entity(entity, 'event1', 'payment.captured')
        process_entity(entity, 'event2', 'payment.captured')
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 19)
        self.assertEqual(PaymentOutbox.objects.count(), 2)
        self.assertEqual(PaymentEvent.objects.count(), 2)

    def test_bad_amount_currency_and_binding_rejected(self):
        order = self.order()
        for change in ({'amount': 1}, {'currency': 'USD'}, {'order_id': 'order_other'}, {'amount': True}):
            with self.assertRaises(APIException):
                process_entity(self.entity(order, **change), str(uuid.uuid4()), 'payment.captured')
        self.assertEqual(PaymentOutbox.objects.count(), 0)

    def test_late_capture_requires_review(self):
        order = self.order()
        order.inventory_reservations.update(expires_at=timezone.now() - timedelta(minutes=1))
        InventoryReservationService.release_expired()
        updated, outcome = process_entity(self.entity(order), 'late', 'payment.captured')
        self.assertEqual(outcome, 'review')
        self.assertEqual(updated.status, Order.Status.CANCELLED)
        self.assertEqual(PaymentOutbox.objects.count(), 0)

    def test_failed_then_successful_attempt(self):
        order = self.order()
        process_entity(self.entity(order, id='pay_failed', status='failed'), 'failure', 'payment.failed')
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)
        updated, _ = process_entity(self.entity(order), 'capture', 'payment.captured')
        self.assertEqual(updated.payment_status, Order.PaymentStatus.PAID)

    def test_failure_after_capture_does_not_regress(self):
        order = self.order()
        process_entity(self.entity(order), 'capture', 'payment.captured')
        updated, _ = process_entity(self.entity(order, status='failed'), 'failure', 'payment.failed')
        self.assertEqual(updated.payment_status, Order.PaymentStatus.PAID)

    def test_second_capture_requires_review(self):
        order = self.order()
        process_entity(self.entity(order), 'capture', 'payment.captured')
        updated, outcome = process_entity(self.entity(order, id='pay_other'), 'other', 'payment.captured')
        self.assertEqual(outcome, 'review')
        self.assertEqual(updated.payment_intent_id, 'pay_test')
        self.assertEqual(PaymentOutbox.objects.count(), 2)

    @patch('apps.orders.payments.gateway')
    def test_initialize_reuses_provider_order(self, gateway):
        def create(*args, **kwargs):
            return {'id': 'order_test', **kwargs['json']}
        gateway.side_effect = create
        first = initialize(None, self.input, self.key)
        second = initialize(None, self.input, self.key)
        self.assertEqual(first, second)
        gateway.assert_called_once()

    @patch('apps.orders.payments.gateway', side_effect=APIException('timeout'))
    def test_unknown_create_never_blindly_retried(self, gateway):
        with self.assertRaises(APIException):
            initialize(None, self.input, self.key)
        with self.assertRaises(APIException):
            initialize(None, self.input, self.key)
        gateway.assert_called_once()
        self.assertEqual(PaymentAttempt.objects.get().status, 'unknown')

    @patch('apps.orders.payments.gateway')
    def test_verify_confirms_database_payment(self, gateway):
        order = self.order()
        gateway.return_value = self.entity(order)
        signature = hmac.new(b'test_secret', b'order_test|pay_test', hashlib.sha256).hexdigest()
        result = verify({'razorpay_order_id': 'order_test', 'razorpay_payment_id': 'pay_test', 'razorpay_signature': signature})
        self.assertTrue(result['success'])
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)

    @patch('apps.orders.payments.gateway')
    def test_authorization_is_not_success(self, gateway):
        order = self.order()
        gateway.return_value = self.entity(order, status='authorized')
        signature = hmac.new(b'test_secret', b'order_test|pay_test', hashlib.sha256).hexdigest()
        result = verify({'razorpay_order_id': 'order_test', 'razorpay_payment_id': 'pay_test', 'razorpay_signature': signature})
        self.assertFalse(result['success'])
        self.assertTrue(result['pending'])
        self.assertFalse(PaymentOutbox.objects.exists())

    def test_webhook_signature_and_duplicate_delivery(self):
        order = self.order()
        body = json.dumps({'event': 'payment.captured', 'payload': {'payment': {'entity': self.entity(order)}}})
        client = APIClient()
        url = '/api/v1/checkout/webhooks/razorpay/'
        self.assertEqual(client.post(url, body, content_type='application/json').status_code, 400)
        signature = hmac.new(b'webhook_secret', body.encode(), hashlib.sha256).hexdigest()
        for _ in range(2):
            self.assertEqual(client.post(url, body, content_type='application/json', HTTP_X_RAZORPAY_SIGNATURE=signature, HTTP_X_RAZORPAY_EVENT_ID='event_test').status_code, 200)
        self.assertEqual(PaymentEvent.objects.count(), 1)
        self.assertEqual(PaymentOutbox.objects.count(), 2)

    @override_settings(RAZORPAY_WEBHOOK_SECRET='')
    def test_empty_webhook_secret_fails_closed(self):
        from apps.orders.services import verify_razorpay_signature
        signature = hmac.new(b'', b'{}', hashlib.sha256).hexdigest()
        self.assertFalse(verify_razorpay_signature(b'{}', signature))

    @patch('apps.orders.tasks.push_order_to_shiprocket_task.run', return_value={'success': True})
    @patch('apps.orders.tasks.send_order_email_receipt.run', return_value={'status': 'sent'})
    def test_outbox_dispatches_only_once(self, email, shipping):
        order = self.order()
        process_entity(self.entity(order), 'capture', 'payment.captured')
        email.assert_not_called()
        process_payment_outbox()
        process_payment_outbox()
        email.assert_called_once()
        shipping.assert_called_once()
        self.assertEqual(PaymentOutbox.objects.filter(status='done').count(), 2)

    @patch('apps.orders.tasks.send_order_email_receipt.run', side_effect=RuntimeError('timeout'))
    def test_uncertain_delivery_is_not_blindly_resent(self, email):
        order = self.order()
        order.payment_status = Order.PaymentStatus.PAID
        order.status = Order.Status.PAID
        order.save()
        PaymentOutbox.objects.create(order=order, kind='receipt')
        process_payment_outbox()
        process_payment_outbox()
        email.assert_called_once()
        self.assertEqual(PaymentOutbox.objects.get().status, 'review')

    @patch('apps.orders.payments.gateway')
    def test_unknown_order_reconciles_without_creation(self, gateway):
        order = self.order()
        attempt = order.payment_attempt
        attempt.gateway_order_id = None
        attempt.status = 'unknown'
        attempt.save()
        gateway.side_effect = [
            {'items': [{'id': 'order_test', 'receipt': order.order_number, 'amount': int(order.total * 100), 'currency': 'INR'}]},
            {'items': [self.entity(order)]},
        ]
        reconcile(attempt)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertTrue(all(call.args[0] == 'GET' for call in gateway.call_args_list))


@skipUnlessDBFeature('has_select_for_update')
class PaymentConcurrencyTests(TransactionTestCase):
    def setUp(self):
        product = Product.objects.create(title='Concurrent', slug='concurrent', sku='CONCURRENT', price=Decimal('500'))
        self.inventory = Inventory.objects.create(product=product, stock_level=20)
        self.input = CheckoutInput([CartItemInput(str(product.pk), 1)], {'email': 'test@example.com'}, 'RAZORPAY', '')

    def parallel(self, function):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier
        from django.db import close_old_connections, connections
        barrier = Barrier(2)
        def run(index):
            close_old_connections()
            try:
                barrier.wait(timeout=5)
                return function(index)
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as executor:
            return list(executor.map(run, [0, 1]))

    def test_simultaneous_checkout_retries_create_one_order(self):
        key = str(uuid.uuid4())
        results = self.parallel(lambda _: CheckoutService.idempotent_checkout(None, self.input, key))
        self.assertEqual(results[0], results[1])
        self.assertEqual(Order.objects.count(), 1)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.reserved_stock, 1)

    def test_simultaneous_captures_commit_once(self):
        result = CheckoutService.process_checkout(None, self.input)
        order = Order.objects.get(pk=result['order_id'])
        PaymentAttempt.objects.create(order=order, gateway_order_id='order_concurrent')
        entity = {'id': 'pay_concurrent', 'order_id': 'order_concurrent', 'amount': int(order.total * 100), 'currency': 'INR', 'status': 'captured'}
        self.parallel(lambda index: process_entity(entity, f'event{index}', 'payment.captured'))
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 19)
        self.assertEqual(PaymentOutbox.objects.count(), 2)
