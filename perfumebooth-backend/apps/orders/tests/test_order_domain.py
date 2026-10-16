from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.checkout.services.checkout_service import CheckoutService
from apps.checkout.validators import CartItemInput, CheckoutInput
from apps.orders.models import Order, OrderItem, Shipment
from apps.orders.services import process_payment_webhook
from apps.shop.models import Inventory, Product, ProductVariant


class OrderDomainTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email='buyer@example.com',
            password='StrongPassword123!',
            first_name='Test',
            last_name='Buyer',
        )
        self.product = Product.objects.create(
            title='Archive Perfume',
            slug='archive-perfume',
            sku='ARCHIVE-100',
            price=Decimal('500.00'),
        )
        Inventory.objects.create(product=self.product, stock_level=5)
        self.variant = ProductVariant.objects.create(
            product=self.product,
            title='50ml',
            sku='ARCHIVE-50',
            price=Decimal('400.00'),
            stock_level=5,
        )
        self.address = {
            'first_name': 'Test',
            'last_name': 'Buyer',
            'address1': '12 Test Street',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'zip': '400001',
            'country_code': 'IN',
            'phone': '+919999999999',
            'email': 'checkout@example.com',
        }

    def checkout(self):
        return CheckoutService.process_checkout(
            self.user,
            CheckoutInput(
                items=[CartItemInput(
                    product_id=str(self.product.id),
                    variant_id=str(self.variant.id),
                    quantity=1,
                )],
                shipping_address=self.address,
                payment_method='RAZORPAY',
                coupon_code='SAVE10',
            ),
        )

    def test_checkout_persists_financial_and_customer_snapshots(self):
        result = self.checkout()
        order = Order.objects.get(id=result['order_id'])

        self.assertEqual(order.subtotal, Decimal('400.00'))
        self.assertEqual(order.discount_amount, Decimal('40.00'))
        self.assertEqual(order.shipping_amount, Decimal('99.00'))
        self.assertEqual(order.tax_amount, Decimal('0.00'))
        self.assertEqual(order.total, Decimal('459.00'))
        self.assertEqual(order.currency, 'INR')
        self.assertEqual(order.payment_method, Order.PaymentMethod.RAZORPAY)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)
        self.assertEqual(order.customer_email, 'checkout@example.com')
        self.assertEqual(order.customer_phone, '+919999999999')

    def test_line_item_snapshot_survives_catalog_deletion(self):
        result = self.checkout()
        item_id = OrderItem.objects.get(order_id=result['order_id']).id
        self.product.delete()

        item = OrderItem.objects.get(id=item_id)
        self.assertIsNone(item.product)
        self.assertIsNone(item.variant)
        self.assertEqual(item.product_title, 'Archive Perfume')
        self.assertEqual(item.variant_title, '50ml')
        self.assertEqual(item.sku, 'ARCHIVE-50')
        self.assertEqual(item.unit_price, Decimal('400.00'))

    def test_shipment_is_provider_neutral_and_separate_from_order(self):
        result = self.checkout()
        order = Order.objects.get(id=result['order_id'])
        shipment = Shipment.objects.create(
            order=order,
            provider='shiprocket',
            provider_order_id='provider-order-1',
            provider_shipment_id='provider-shipment-1',
            awb_code='AWB123',
            status=Shipment.Status.SHIPPED,
        )

        self.assertEqual(order.shipments.get(), shipment)
        self.assertEqual(shipment.provider, 'shiprocket')
        self.assertFalse(hasattr(order, 'shiprocket_order_id'))

    def test_shiprocket_webhook_updates_shipment_and_cod_payment(self):
        result = CheckoutService.process_checkout(
            self.user,
            CheckoutInput(
                items=[CartItemInput(product_id=str(self.product.id), quantity=1)],
                shipping_address=self.address,
                payment_method='COD',
                coupon_code='',
            ),
        )
        order = Order.objects.get(id=result['order_id'])

        response = self.client.post('/api/v1/checkout/webhooks/shiprocket/', {
            'order_id': order.order_number,
            'current_status': 'DELIVERED',
            'shipment_id': 'provider-shipment-delivered',
            'awb': 'AWB-DELIVERED',
            'courier_name': 'Test Courier',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        shipment = order.shipments.get()
        self.assertEqual(order.status, Order.Status.DELIVERED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(shipment.status, Shipment.Status.DELIVERED)
        self.assertEqual(shipment.provider_shipment_id, 'provider-shipment-delivered')

    @patch('apps.orders.tasks.push_order_to_shiprocket_task.delay')
    @patch('apps.orders.tasks.send_order_email_receipt.delay')
    def test_payment_webhook_updates_explicit_payment_status(self, email_delay, shipment_delay):
        result = self.checkout()
        from apps.orders.models import PaymentAttempt, PaymentOutbox
        from apps.orders.payments import process_entity
        pending = Order.objects.get(pk=result['order_id'])
        PaymentAttempt.objects.create(order=pending, gateway_order_id='order_test')
        order, _ = process_entity({'id': 'pay_phase4_123', 'order_id': 'order_test', 'amount': int(pending.total * 100), 'currency': 'INR', 'status': 'captured'}, 'test_capture', 'payment.captured')

        self.assertEqual(order.status, Order.Status.PAID)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(order.payment_intent_id, 'pay_phase4_123')
        email_delay.assert_not_called()
        shipment_delay.assert_not_called()
        self.assertEqual(PaymentOutbox.objects.filter(order=order).count(), 2)
