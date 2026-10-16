from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.checkout.services.checkout_service import CheckoutService
from apps.checkout.validators import CartItemInput, CheckoutInput
from apps.orders.models import Order
from apps.orders.services import process_payment_webhook
from apps.shop.models import Inventory, Product, ProductVariant

from ..models import InventoryMovement, InventoryReservation
from ..services import InventoryReservationService


class InventoryReservationLifecycleTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='inventory@example.com', password='StrongPassword123!'
        )
        self.product = Product.objects.create(
            title='Inventory Test', slug='inventory-test', sku='INV-1', price=Decimal('500.00')
        )
        self.inventory = Inventory.objects.create(product=self.product, stock_level=10)
        self.variant = ProductVariant.objects.create(
            product=self.product,
            title='50ml',
            sku='INV-1-50',
            price=Decimal('600.00'),
            stock_level=5,
        )

    def checkout(self, payment_method='RAZORPAY', variant=False, quantity=2):
        item = CartItemInput(
            product_id=str(self.product.id),
            variant_id=str(self.variant.id) if variant else None,
            quantity=quantity,
        )
        result = CheckoutService.process_checkout(
            self.user,
            CheckoutInput(
                items=[item],
                shipping_address={'city': 'Mumbai'},
                payment_method=payment_method,
                coupon_code='',
            ),
        )
        return Order.objects.get(id=result['order_id'])

    def test_prepaid_checkout_reserves_without_deducting_stock(self):
        order = self.checkout()

        self.inventory.refresh_from_db()
        reservation = order.inventory_reservations.get()
        self.assertEqual(self.inventory.stock_level, 10)
        self.assertEqual(self.inventory.reserved_stock, 2)
        self.assertEqual(self.inventory.available_stock, 8)
        self.assertEqual(reservation.status, InventoryReservation.Status.ACTIVE)
        self.assertTrue(
            reservation.movements.filter(
                movement_type=InventoryMovement.Type.RESERVE,
                stock_delta=0,
                reserved_delta=2,
            ).exists()
        )

    @patch('apps.orders.tasks.push_order_to_shiprocket_task.delay')
    @patch('apps.orders.tasks.send_order_email_receipt.delay')
    def test_verified_payment_commits_reservation_once(self, _email, _shiprocket):
        order = self.checkout()

        from apps.orders.models import PaymentAttempt
        from apps.orders.payments import process_entity
        PaymentAttempt.objects.create(order=order, gateway_order_id='order_test')
        paid_order, _ = process_entity({'id': 'pay_inventory_test', 'order_id': 'order_test', 'amount': int(order.total * 100), 'currency': 'INR', 'status': 'captured'}, 'test_capture', 'payment.captured')

        self.inventory.refresh_from_db()
        reservation = order.inventory_reservations.get()
        self.assertEqual(paid_order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(self.inventory.stock_level, 8)
        self.assertEqual(self.inventory.reserved_stock, 0)
        self.assertEqual(reservation.status, InventoryReservation.Status.COMMITTED)
        self.assertEqual(InventoryReservationService.commit_order(order), 0)

    def test_cod_checkout_reserves_and_commits_immediately(self):
        order = self.checkout(payment_method='COD')

        self.inventory.refresh_from_db()
        reservation = order.inventory_reservations.get()
        self.assertEqual(self.inventory.stock_level, 8)
        self.assertEqual(self.inventory.reserved_stock, 0)
        self.assertEqual(reservation.status, InventoryReservation.Status.COMMITTED)
        self.assertEqual(
            list(reservation.movements.order_by('created_at').values_list('movement_type', flat=True)),
            [InventoryMovement.Type.RESERVE, InventoryMovement.Type.COMMIT],
        )

    def test_release_restores_available_stock_without_changing_physical_stock(self):
        order = self.checkout(variant=True, quantity=3)

        self.assertEqual(InventoryReservationService.release_order(order), 1)

        self.variant.refresh_from_db()
        reservation = order.inventory_reservations.get()
        self.assertEqual(self.variant.stock_level, 5)
        self.assertEqual(self.variant.reserved_stock, 0)
        self.assertEqual(reservation.status, InventoryReservation.Status.RELEASED)

    def test_expired_reservation_is_released_and_order_cancelled(self):
        order = self.checkout()
        order.inventory_reservations.update(expires_at=timezone.now() - timedelta(seconds=1))

        self.assertEqual(InventoryReservationService.release_expired(), 1)

        order.refresh_from_db()
        self.inventory.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.FAILED)
        self.assertEqual(self.inventory.stock_level, 10)
        self.assertEqual(self.inventory.reserved_stock, 0)
        self.assertEqual(
            order.inventory_reservations.get().status,
            InventoryReservation.Status.EXPIRED,
        )
