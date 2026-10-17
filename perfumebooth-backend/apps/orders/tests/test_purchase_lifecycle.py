import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.checkout.services.checkout_service import CheckoutService
from apps.checkout.validators import CartItemInput, CheckoutInput
from apps.inventory.models import InventoryMovement, InventoryReservation
from apps.inventory.services import InventoryReservationService
from apps.orders.models import Order, OrderItem, PaymentAttempt, PaymentEvent, PaymentOutbox, Shipment
from apps.orders.payments import initialize, process_entity, verify
from apps.orders.tasks import process_payment_outbox
from apps.shop.models import Inventory, Product, ProductVariant


@override_settings(
    RAZORPAY_KEY_ID='test_rzp_key',
    RAZORPAY_KEY_SECRET='test_rzp_secret',
    RAZORPAY_WEBHOOK_SECRET='test_rzp_webhook_secret'
)
class PurchaseLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email='shopper@perfumebooth.com',
            password='TestPassword123!',
            first_name='Alex',
            last_name='Perfumer',
        )
        self.client.force_authenticate(user=self.user)

        self.product = Product.objects.create(
            title='Oud Royal 100ml',
            slug='oud-royal-100ml',
            sku='OUD-100',
            price=Decimal('1200.00'),
        )
        self.inventory = Inventory.objects.create(
            product=self.product,
            stock_level=10,
            reserved_stock=0,
        )

        self.address = {
            'first_name': 'Alex',
            'last_name': 'Perfumer',
            'address1': '100 Fragrance Avenue',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'zip': '400001',
            'country_code': 'IN',
            'phone': '+919876543210',
            'email': 'shopper@perfumebooth.com',
        }

    def _cart_input(self, payment_method='COD', quantity=1):
        return CheckoutInput(
            items=[CartItemInput(product_id=str(self.product.id), quantity=quantity)],
            shipping_address=self.address,
            payment_method=payment_method,
            coupon_code='',
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 1. CART VALIDATION
    # ─────────────────────────────────────────────────────────────────────────
    def test_cart_validation_reports_stock_and_availability(self):
        response = self.client.post('/api/v1/cart/validate/', [
            {'product_id': str(self.product.id), 'quantity': 2, 'price': '1200.00'}
        ], format='json')
        self.assertEqual(response.status_code, 200)
        result = response.json()
        payload = result.get('data', result)
        items = payload.get('items', payload)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['status'], 'AVAILABLE')
        self.assertTrue(items[0]['is_in_stock'])
        self.assertEqual(items[0]['available_stock'], 10)

    # ─────────────────────────────────────────────────────────────────────────
    # 2. COMPLETE COD PURCHASE LIFECYCLE
    # (Cart -> Checkout -> COD Order -> Stock Commit -> Notification Outbox -> Shipping -> Delivery)
    # ─────────────────────────────────────────────────────────────────────────
    @patch('apps.orders.tasks.push_order_to_shiprocket_task.run', return_value={'success': True})
    @patch('apps.orders.tasks.send_order_email_receipt.run', return_value={'status': 'sent'})
    def test_complete_cod_purchase_lifecycle(self, mock_email, mock_shipping):
        key = str(uuid.uuid4())
        checkout_input = self._cart_input(payment_method='COD', quantity=2)

        # 1. Checkout & Order Creation
        result = CheckoutService.idempotent_checkout(self.user, checkout_input, key)
        order = Order.objects.get(id=result['order_id'])

        self.assertEqual(order.status, Order.Status.PROCESSING)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)
        self.assertEqual(order.payment_method, Order.PaymentMethod.COD)
        self.assertEqual(order.subtotal, Decimal('2400.00'))

        # 2. Inventory: Stock immediately committed for COD
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 8)
        self.assertEqual(self.inventory.reserved_stock, 0)

        reservation = order.inventory_reservations.get()
        self.assertEqual(reservation.status, InventoryReservation.Status.COMMITTED)
        self.assertEqual(reservation.quantity, 2)

        movements = InventoryMovement.objects.filter(order=order).order_by('created_at')
        self.assertEqual(movements.count(), 2)
        self.assertEqual(movements[0].movement_type, InventoryMovement.Type.RESERVE)
        self.assertEqual(movements[1].movement_type, InventoryMovement.Type.COMMIT)

        # 3. Notification & Shipping Outbox Created
        outbox_entries = PaymentOutbox.objects.filter(order=order)
        self.assertEqual(outbox_entries.count(), 2)
        self.assertTrue(outbox_entries.filter(kind='receipt', status='pending').exists())
        self.assertTrue(outbox_entries.filter(kind='fulfillment', status='pending').exists())

        # 4. Outbox Worker Dispatches
        process_payment_outbox()
        mock_email.assert_called_once()
        mock_shipping.assert_called_once()
        self.assertEqual(PaymentOutbox.objects.filter(order=order, status='done').count(), 2)

        # 5. Shipping Webhooks (AWB Assigned -> Shipped -> Delivered)
        Shipment.objects.create(
            order=order,
            provider='shiprocket',
            provider_order_id=order.order_number,
            status=Shipment.Status.PENDING,
        )

        with patch('apps.orders.tasks.send_shipping_dispatch_email.delay') as mock_dispatch_email:
            # Shipped webhook
            resp = self.client.post('/api/v1/checkout/webhooks/shiprocket/', {
                'order_id': order.order_number,
                'current_status': 'SHIPPED',
                'shipment_id': 'SR-SHIP-123',
                'awb': 'AWB-COD-999',
                'courier_name': 'Bluedart Express',
            }, format='json')
            self.assertEqual(resp.status_code, 200)
            mock_dispatch_email.assert_called_once_with(str(order.id))

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.SHIPPED)

        # Delivered webhook: COD payment is collected on delivery -> marks order PAID
        resp = self.client.post('/api/v1/checkout/webhooks/shiprocket/', {
            'order_id': order.order_number,
            'current_status': 'DELIVERED',
            'shipment_id': 'SR-SHIP-123',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.DELIVERED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)

    # ─────────────────────────────────────────────────────────────────────────
    # 3. COMPLETE PREPAID (RAZORPAY) PURCHASE LIFECYCLE
    # (Cart -> Checkout -> Reserve -> Init -> Verify/Capture -> Commit -> Outbox)
    # ─────────────────────────────────────────────────────────────────────────
    @patch('apps.orders.tasks.push_order_to_shiprocket_task.run', return_value={'success': True})
    @patch('apps.orders.tasks.send_order_email_receipt.run', return_value={'status': 'sent'})
    @patch('apps.orders.payments.gateway')
    def test_complete_prepaid_purchase_lifecycle(self, mock_gateway, mock_email, mock_shipping):
        key = str(uuid.uuid4())
        checkout_input = self._cart_input(payment_method='RAZORPAY', quantity=1)

        def mock_rzp_create(method, path, **kwargs):
            return {
                'id': 'order_rzplifecycle1',
                'amount': kwargs['json']['amount'],
                'currency': kwargs['json']['currency'],
                'receipt': kwargs['json']['receipt'],
            }
        mock_gateway.side_effect = mock_rzp_create

        # 1. Initialize Razorpay Checkout
        init_res = initialize(self.user, checkout_input, key)
        self.assertTrue(init_res['success'])
        order = Order.objects.get(id=init_res['internalOrderId'])
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

        # 2. Inventory is reserved (stock_level still 10, reserved_stock is 1)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 10)
        self.assertEqual(self.inventory.reserved_stock, 1)

        # 3. Webhook / Callback Capture
        capture_entity = {
            'id': 'pay_rzpcapture1',
            'order_id': 'order_rzplifecycle1',
            'amount': int(order.total * 100),
            'currency': 'INR',
            'status': 'captured',
        }
        order, outcome = process_entity(capture_entity, 'event_rzp_1', 'payment.captured')
        self.assertEqual(outcome, 'paid')
        self.assertEqual(order.status, Order.Status.PAID)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(order.payment_intent_id, 'pay_rzpcapture1')

        # 4. Inventory is committed (stock_level drops to 9, reserved drops to 0)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 9)
        self.assertEqual(self.inventory.reserved_stock, 0)
        self.assertEqual(order.inventory_reservations.get().status, InventoryReservation.Status.COMMITTED)

        # 5. Outbox dispatches
        process_payment_outbox()
        mock_email.assert_called_once()
        mock_shipping.assert_called_once()

    # ─────────────────────────────────────────────────────────────────────────
    # 4. FAILED PAYMENT HANDLING
    # ─────────────────────────────────────────────────────────────────────────
    def test_failed_payment_keeps_order_pending_for_retry_without_committing_stock(self):
        key = str(uuid.uuid4())
        checkout_input = self._cart_input(payment_method='RAZORPAY', quantity=1)

        result = CheckoutService.idempotent_checkout(self.user, checkout_input, key)
        order = Order.objects.get(id=result['order_id'])
        PaymentAttempt.objects.create(order=order, gateway_order_id='order_fail123', status='ready')

        # Payment failed event
        fail_entity = {
            'id': 'pay_failed1',
            'order_id': 'order_fail123',
            'amount': int(order.total * 100),
            'currency': 'INR',
            'status': 'failed',
        }
        order, outcome = process_entity(fail_entity, 'event_fail_1', 'payment.failed')
        self.assertEqual(outcome, 'attempt_failed')

        # Order remains PENDING so user can retry payment
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

        # Stock is still reserved, NOT committed
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 10)
        self.assertEqual(self.inventory.reserved_stock, 1)

        # Customer retries and payment succeeds
        success_entity = {
            'id': 'pay_successretry',
            'order_id': 'order_fail123',
            'amount': int(order.total * 100),
            'currency': 'INR',
            'status': 'captured',
        }
        order, outcome = process_entity(success_entity, 'event_success_retry', 'payment.captured')
        self.assertEqual(outcome, 'paid')
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 9)

    # ─────────────────────────────────────────────────────────────────────────
    # 5. REPEATED & DUPLICATE PAYMENTS (IDEMPOTENCY)
    # ─────────────────────────────────────────────────────────────────────────
    def test_repeated_payment_webhook_is_idempotent(self):
        key = str(uuid.uuid4())
        checkout_input = self._cart_input(payment_method='RAZORPAY', quantity=1)

        result = CheckoutService.idempotent_checkout(self.user, checkout_input, key)
        order = Order.objects.get(id=result['order_id'])
        PaymentAttempt.objects.create(order=order, gateway_order_id='order_dup123', status='ready')

        entity = {
            'id': 'pay_dup1',
            'order_id': 'order_dup123',
            'amount': int(order.total * 100),
            'currency': 'INR',
            'status': 'captured',
        }

        # First capture
        order, outcome1 = process_entity(entity, 'evt_1', 'payment.captured')
        self.assertEqual(outcome1, 'paid')
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 9)

        # Redelivery of same webhook event
        order, outcome2 = process_entity(entity, 'evt_1', 'payment.captured')
        self.assertEqual(outcome2, 'paid')
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 9)  # Not decremented again

        # Different event ID for the same payment ID
        order, outcome3 = process_entity(entity, 'evt_2', 'payment.captured')
        self.assertEqual(outcome3, 'duplicate')
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 9)  # Still 9

        # Only one set of outbox entries
        self.assertEqual(PaymentOutbox.objects.filter(order=order).count(), 2)

    def test_second_capture_with_different_payment_id_requires_operator_review(self):
        key = str(uuid.uuid4())
        result = CheckoutService.idempotent_checkout(self.user, self._cart_input(payment_method='RAZORPAY'), key)
        order = Order.objects.get(id=result['order_id'])
        PaymentAttempt.objects.create(order=order, gateway_order_id='order_multi123', status='ready')

        # First payment capture succeeds
        p1 = {'id': 'pay_first', 'order_id': 'order_multi123', 'amount': int(order.total * 100), 'currency': 'INR', 'status': 'captured'}
        process_entity(p1, 'evt_p1', 'payment.captured')

        # Second unexpected capture for the same order
        p2 = {'id': 'pay_second', 'order_id': 'order_multi123', 'amount': int(order.total * 100), 'currency': 'INR', 'status': 'captured'}
        order, outcome = process_entity(p2, 'evt_p2', 'payment.captured')
        self.assertEqual(outcome, 'review')
        self.assertEqual(order.payment_intent_id, 'pay_first')  # Original payment untouched

    # ─────────────────────────────────────────────────────────────────────────
    # 6. CANCELLATION & INVENTORY RESTORATION (PENDING ORDER)
    # ─────────────────────────────────────────────────────────────────────────
    def test_cancellation_of_pending_order_releases_active_reservation(self):
        key = str(uuid.uuid4())
        result = CheckoutService.idempotent_checkout(self.user, self._cart_input(payment_method='RAZORPAY', quantity=2), key)
        order = Order.objects.get(id=result['order_id'])

        # Stock is reserved
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 10)
        self.assertEqual(self.inventory.reserved_stock, 2)

        # Cancel order via API endpoint
        response = self.client.post(f'/api/v1/orders/{order.id}/cancel/', {'reason': 'Changed mind'}, format='json')
        self.assertEqual(response.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.CANCELLED)

        # Reservation is released, reserved_stock back to 0
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 10)
        self.assertEqual(self.inventory.reserved_stock, 0)
        self.assertEqual(order.inventory_reservations.get().status, InventoryReservation.Status.RELEASED)

    # ─────────────────────────────────────────────────────────────────────────
    # 7. CANCELLATION & STOCK RESTORATION (COD COMMITTED ORDER)
    # ─────────────────────────────────────────────────────────────────────────
    def test_cancellation_of_cod_order_restores_committed_stock(self):
        key = str(uuid.uuid4())
        result = CheckoutService.idempotent_checkout(self.user, self._cart_input(payment_method='COD', quantity=3), key)
        order = Order.objects.get(id=result['order_id'])

        # COD commits stock immediately: stock_level drops from 10 to 7
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 7)

        # Customer cancels COD order
        response = self.client.post(f'/api/v1/orders/{order.id}/cancel/', {'reason': 'Ordered by mistake'}, format='json')
        self.assertEqual(response.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.CANCELLED)

        # Committed stock is restored: 7 + 3 = 10!
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 10)

        # InventoryMovement of Type RETURN recorded
        return_mv = InventoryMovement.objects.filter(order=order, movement_type=InventoryMovement.Type.RETURN).first()
        self.assertIsNotNone(return_mv)
        self.assertEqual(return_mv.stock_delta, 3)

        # Calling cancel again is idempotent and doesn't double restore stock
        resp2 = self.client.post(f'/api/v1/orders/{order.id}/cancel/', format='json')
        self.assertEqual(resp2.status_code, 200)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 10)

    # ─────────────────────────────────────────────────────────────────────────
    # 8. CANCELLATION & REFUND OF PAID ORDER
    # ─────────────────────────────────────────────────────────────────────────
    def test_cancellation_of_paid_order_restores_stock_and_marks_refunded(self):
        key = str(uuid.uuid4())
        result = CheckoutService.idempotent_checkout(self.user, self._cart_input(payment_method='RAZORPAY', quantity=1), key)
        order = Order.objects.get(id=result['order_id'])
        PaymentAttempt.objects.create(order=order, gateway_order_id='order_cancelpaid123', status='ready')

        # Pay order
        entity = {'id': 'pay_cancelpaid', 'order_id': 'order_cancelpaid123', 'amount': int(order.total * 100), 'currency': 'INR', 'status': 'captured'}
        process_entity(entity, 'evt_cp1', 'payment.captured')

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 9)

        # Cancel paid order
        response = self.client.post(f'/api/v1/orders/{order.id}/cancel/', format='json')
        self.assertEqual(response.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.REFUNDED)

        # Stock restored back to 10
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 10)

    # ─────────────────────────────────────────────────────────────────────────
    # 9. GATEWAY REFUND WEBHOOK HANDLING
    # ─────────────────────────────────────────────────────────────────────────
    def test_gateway_refund_webhook_restores_inventory(self):
        key = str(uuid.uuid4())
        result = CheckoutService.idempotent_checkout(self.user, self._cart_input(payment_method='RAZORPAY', quantity=2), key)
        order = Order.objects.get(id=result['order_id'])
        PaymentAttempt.objects.create(order=order, gateway_order_id='order_gwrefund123', status='ready')

        # Pay
        entity = {'id': 'pay_torefund', 'order_id': 'order_gwrefund123', 'amount': int(order.total * 100), 'currency': 'INR', 'status': 'captured'}
        process_entity(entity, 'evt_pay_refund', 'payment.captured')
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 8)

        # Webhook receives payment.refunded
        refund_entity = {'id': 'pay_torefund', 'order_id': 'order_gwrefund123', 'amount': int(order.total * 100), 'currency': 'INR', 'status': 'refunded'}
        order, outcome = process_entity(refund_entity, 'evt_refund_processed', 'payment.refunded')
        self.assertEqual(outcome, 'refunded')

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.REFUNDED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.REFUNDED)

        # Stock returned
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 10)

    # ─────────────────────────────────────────────────────────────────────────
    # 10. CANNOT CANCEL SHIPPED OR DELIVERED ORDER
    # ─────────────────────────────────────────────────────────────────────────
    def test_cannot_cancel_shipped_order(self):
        key = str(uuid.uuid4())
        result = CheckoutService.idempotent_checkout(self.user, self._cart_input(payment_method='COD'), key)
        order = Order.objects.get(id=result['order_id'])
        order.status = Order.Status.SHIPPED
        order.save()

        response = self.client.post(f'/api/v1/orders/{order.id}/cancel/', format='json')
        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.SHIPPED)
