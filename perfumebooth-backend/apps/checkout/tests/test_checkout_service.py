"""
Unit and Integration Tests for Checkout Service and API
Covers:
- Totals calculations with Decimal precision
- Active coupons and invalid coupon rejection
- Variant and simple product stock management
- Insufficient stock exceptions and transactional rollback
- Immunity to client price tampering
- Thin controller CheckoutView and standard API contract
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.shop.models import Product, ProductVariant, Inventory
from apps.orders.models import Order, OrderItem
from apps.checkout.services.pricing_service import PricingService
from apps.checkout.services.inventory_service import InventoryService
from apps.checkout.services.checkout_service import CheckoutService
from apps.checkout.validators import validate_checkout_request, CartItemInput, CheckoutInput
from apps.checkout.exceptions import (
    EmptyCartException,
    InvalidQuantityException,
    ProductNotFoundException,
    VariantNotFoundException,
    InsufficientStockException,
    InvalidCouponException,
)
from core.constants import ErrorCode

User = get_user_model()


def valid_shipping_address(**overrides):
    address = {
        'firstName': 'Jane',
        'lastName': 'Doe',
        'address1': '12 Test Street',
        'city': 'Mumbai',
        'state': 'Maharashtra',
        'zip': '400001',
        'countryCode': 'IN',
        'phone': '+919999999999',
        'email': 'jane@example.com',
    }
    address.update(overrides)
    return address


class PricingServiceTests(TestCase):
    """Test server-authoritative Decimal calculations, coupon logic, and shipping fees."""

    def setUp(self):
        self.product = Product.objects.create(
            title="Eau de Parfum 100ml",
            slug="eau-de-parfum-100ml",
            sku="EDP-100",
            price=Decimal("499.50")
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            title="50ml Travel Size",
            sku="EDP-50-VAR",
            price=Decimal("299.99"),
            stock_level=10
        )

    def test_line_price_resolution(self):
        # Product price
        prod_price = PricingService.calculate_line_price(self.product)
        self.assertEqual(prod_price, Decimal("499.50"))
        self.assertIsInstance(prod_price, Decimal)

        # Variant price takes precedence
        var_price = PricingService.calculate_line_price(self.product, self.variant)
        self.assertEqual(var_price, Decimal("299.99"))
        self.assertIsInstance(var_price, Decimal)

    def test_shipping_fee_below_threshold(self):
        # Subtotal < 999.00 incurs standard shipping of 99.00
        shipping = PricingService.calculate_shipping(Decimal("500.00"), {'free_shipping': False})
        self.assertEqual(shipping, Decimal("99.00"))

    def test_shipping_fee_above_threshold(self):
        # Subtotal >= 999.00 gets free shipping
        shipping = PricingService.calculate_shipping(Decimal("999.00"), {'free_shipping': False})
        self.assertEqual(shipping, Decimal("0.00"))

        shipping_higher = PricingService.calculate_shipping(Decimal("1500.00"), {'free_shipping': False})
        self.assertEqual(shipping_higher, Decimal("0.00"))

    def test_coupon_percentage_discounts(self):
        subtotal = Decimal("1000.00")
        
        # SAVE10 -> 10% = 100.00
        res10 = PricingService.validate_and_calculate_coupon("SAVE10", subtotal)
        self.assertEqual(res10['discount_amount'], Decimal("100.00"))
        self.assertFalse(res10['free_shipping'])

        # BLOOM15 -> 15% = 150.00
        res15 = PricingService.validate_and_calculate_coupon("bloom15", subtotal)
        self.assertEqual(res15['discount_amount'], Decimal("150.00"))

    def test_coupon_free_shipping(self):
        # FREESHIP provides free shipping regardless of subtotal
        res = PricingService.validate_and_calculate_coupon("FREESHIP", Decimal("300.00"))
        self.assertTrue(res['free_shipping'])
        self.assertEqual(res['discount_amount'], Decimal("0.00"))

        shipping = PricingService.calculate_shipping(Decimal("300.00"), res)
        self.assertEqual(shipping, Decimal("0.00"))

    def test_invalid_coupon_raises_exception(self):
        with self.assertRaises(InvalidCouponException) as ctx:
            PricingService.validate_and_calculate_coupon("INVALID_CODE_XYZ", Decimal("500.00"))
        self.assertEqual(ctx.exception.code, ErrorCode.INVALID_COUPON)

    def test_empty_coupon_is_noop(self):
        res = PricingService.validate_and_calculate_coupon("", Decimal("500.00"))
        self.assertEqual(res['discount_amount'], Decimal("0.00"))
        self.assertFalse(res['free_shipping'])


class InventoryServiceTests(TestCase):
    """Test stock locking and available-stock validation."""

    def setUp(self):
        self.product = Product.objects.create(
            title="Scent of Summer",
            slug="scent-of-summer",
            sku="SUM-100",
            price=Decimal("1200.00")
        )
        self.inventory = Inventory.objects.create(
            product=self.product,
            stock_level=5,
            reserved_stock=1
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            title="Special Edition 100ml",
            sku="SUM-100-SE",
            price=Decimal("1400.00"),
            stock_level=3
        )

    def test_simple_product_stock_lock(self):
        # Available stock is 5 - 1 = 4. Requesting 3 is valid.
        item_input = [CartItemInput(product_id=str(self.product.id), quantity=3)]
        locked = InventoryService.lock_and_validate_stock(item_input)
        self.assertEqual(len(locked), 1)
        self.assertIsNone(locked[0].variant)

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_level, 5)

    def test_simple_product_insufficient_stock(self):
        # Available stock is 4. Requesting 5 should fail.
        item_input = [CartItemInput(product_id=str(self.product.id), quantity=5)]
        with self.assertRaises(InsufficientStockException):
            InventoryService.lock_and_validate_stock(item_input)

    def test_variant_stock_lock(self):
        # Variant stock is 3. Requesting 2 is valid.
        item_input = [CartItemInput(
            product_id=str(self.product.id),
            variant_id=str(self.variant.id),
            quantity=2
        )]
        locked = InventoryService.lock_and_validate_stock(item_input)
        self.assertEqual(len(locked), 1)
        self.assertEqual(locked[0].variant.id, self.variant.id)

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_level, 3)

    def test_variant_insufficient_stock(self):
        item_input = [CartItemInput(
            product_id=str(self.product.id),
            variant_id=str(self.variant.id),
            quantity=4
        )]
        with self.assertRaises(InsufficientStockException):
            InventoryService.lock_and_validate_stock(item_input)

    def test_nonexistent_product_raises_not_found(self):
        item_input = [CartItemInput(product_id="00000000-0000-0000-0000-000000000000", quantity=1)]
        with self.assertRaises(ProductNotFoundException):
            InventoryService.lock_and_validate_stock(item_input)

    def test_nonexistent_variant_raises_not_found(self):
        item_input = [CartItemInput(
            product_id=str(self.product.id),
            variant_id="00000000-0000-0000-0000-000000000000",
            quantity=1
        )]
        with self.assertRaises(VariantNotFoundException):
            InventoryService.lock_and_validate_stock(item_input)

    def test_offline_product_is_unavailable(self):
        self.product.is_online = False
        self.product.save(update_fields=['is_online'])
        with self.assertRaises(Exception) as ctx:
            InventoryService.lock_and_validate_stock([
                CartItemInput(product_id=str(self.product.id), quantity=1)
            ])
        self.assertEqual(ctx.exception.code, ErrorCode.PRODUCT_UNAVAILABLE)

    def test_missing_inventory_is_unavailable(self):
        self.inventory.delete()
        with self.assertRaises(Exception) as ctx:
            InventoryService.lock_and_validate_stock([
                CartItemInput(product_id=str(self.product.id), quantity=1)
            ])
        self.assertEqual(ctx.exception.code, ErrorCode.PRODUCT_UNAVAILABLE)


class CheckoutServiceTests(TestCase):
    """Test full transactional checkout workflow."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="shopper@perfumebooth.com",
            password="SecurePassword123!",
            first_name="Jane",
            last_name="Doe"
        )
        self.prod1 = Product.objects.create(
            title="Amber Noir",
            slug="amber-noir",
            sku="AMB-01",
            price=Decimal("1200.00")
        )
        Inventory.objects.create(product=self.prod1, stock_level=10, reserved_stock=0)

        self.prod2 = Product.objects.create(
            title="Velvet Rose",
            slug="velvet-rose",
            sku="VEL-02",
            price=Decimal("800.00")
        )
        self.prod2_var = ProductVariant.objects.create(
            product=self.prod2,
            title="50ml",
            sku="VEL-02-50",
            price=Decimal("450.00"),
            stock_level=5
        )

    def test_successful_checkout_end_to_end(self):
        checkout_input = CheckoutInput(
            items=[
                CartItemInput(product_id=str(self.prod1.id), quantity=1),
                CartItemInput(product_id=str(self.prod2.id), variant_id=str(self.prod2_var.id), quantity=2)
            ],
            shipping_address={'city': 'Mumbai', 'postal_code': '400001'},
            payment_method='COD',
            coupon_code='SAVE10'
        )

        result = CheckoutService.process_checkout(self.user, checkout_input)

        # Expected numbers:
        # Item 1: 1200.00 * 1 = 1200.00
        # Item 2: 450.00 * 2 = 900.00
        # Subtotal: 2100.00
        # Coupon: SAVE10 -> 10% of 2100.00 = 210.00
        # Shipping: Subtotal >= 999.00 -> 0.00
        # Total: 2100.00 - 210.00 + 0.00 = 1890.00
        self.assertEqual(result['subtotal'], "2100.00")
        self.assertEqual(result['discount_amount'], "210.00")
        self.assertEqual(result['shipping_cost'], "0.00")
        self.assertEqual(result['total'], "1890.00")
        self.assertEqual(result['items_count'], 3)

        # Verify order in DB
        order = Order.objects.get(id=result['order_id'])
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.subtotal, Decimal("2100.00"))
        self.assertEqual(order.total, Decimal("1890.00"))
        self.assertEqual(order.status, Order.Status.PROCESSING)  # COD moves to PROCESSING

        # Verify order items
        self.assertEqual(order.items.count(), 2)
        variant_item = order.items.get(product=self.prod2)
        self.assertEqual(variant_item.variant, self.prod2_var)
        self.assertEqual(variant_item.product_title, self.prod2.title)
        self.assertEqual(variant_item.variant_title, self.prod2_var.title)
        self.assertEqual(variant_item.sku, self.prod2_var.sku)

        # Verify stock decrement
        inv1 = Inventory.objects.get(product=self.prod1)
        self.assertEqual(inv1.stock_level, 9)

        var2 = ProductVariant.objects.get(id=self.prod2_var.id)
        self.assertEqual(var2.stock_level, 3)

    def test_transactional_rollback_on_stock_failure(self):
        # prod1 has 10 in stock. prod2_var only has 5. Requesting 10 of prod2_var should fail
        # and prod1 stock MUST NOT be decremented, and NO order should be created.
        checkout_input = CheckoutInput(
            items=[
                CartItemInput(product_id=str(self.prod1.id), quantity=1),
                CartItemInput(product_id=str(self.prod2.id), variant_id=str(self.prod2_var.id), quantity=10)
            ],
            shipping_address={'city': 'Delhi'},
            payment_method='COD',
            coupon_code=''
        )

        with self.assertRaises(InsufficientStockException):
            CheckoutService.process_checkout(self.user, checkout_input)

        # Check that stock was not modified
        inv1 = Inventory.objects.get(product=self.prod1)
        self.assertEqual(inv1.stock_level, 10)

        var2 = ProductVariant.objects.get(id=self.prod2_var.id)
        self.assertEqual(var2.stock_level, 5)

        # Check no orders were created
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(OrderItem.objects.count(), 0)

    def test_price_tampering_is_completely_ignored(self):
        # Pass input with attempts to manipulate price and shipping
        tampered_data = {
            'items': [
                {
                    'id': str(self.prod1.id),
                    'quantity': 1,
                    'price': '1.00',             # Fake client price
                    'unit_price': 0.50,          # Fake client price
                    'line_total': '1.00'
                }
            ],
            'shipping_address': {
                **valid_shipping_address(city='Bangalore'),
                'shipping_cost': 0.00            # Fake free shipping request
            },
            'subtotal': '1.00',
            'total': '1.00'
        }

        clean_input = validate_checkout_request(tampered_data)
        result = CheckoutService.process_checkout(self.user, clean_input)

        # Authoritative price is 1200.00
        self.assertEqual(result['subtotal'], "1200.00")
        self.assertEqual(result['total'], "1200.00")


class CheckoutViewAPITests(TestCase):
    """Test the thin controller CheckoutView at /api/v1/checkout/."""

    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            title="Oud Royal",
            slug="oud-royal",
            sku="OUD-01",
            price=Decimal("799.00")
        )
        Inventory.objects.create(product=self.product, stock_level=10, reserved_stock=0)

    def test_empty_cart_returns_error(self):
        resp = self.client.post('/api/v1/checkout/', {'items': []}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        data = resp.json()
        self.assertIn('error', data)
        self.assertEqual(data['error']['code'], ErrorCode.CART_EMPTY)

    def test_invalid_quantity_returns_error(self):
        payload = {
            'items': [{'id': str(self.product.id), 'quantity': 0}]
        }
        resp = self.client.post('/api/v1/checkout/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        data = resp.json()
        self.assertEqual(data['error']['code'], ErrorCode.VALIDATION_ERROR)

    def test_missing_shipping_fields_returns_error(self):
        payload = {
            'items': [{'id': str(self.product.id), 'quantity': 1}],
            'shipping_address': {'city': 'Pune'},
        }
        resp = self.client.post('/api/v1/checkout/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('shipping_address', resp.json()['error']['fields'])

    def test_unsupported_payment_method_returns_error(self):
        payload = {
            'items': [{'id': str(self.product.id), 'quantity': 1}],
            'shipping_address': valid_shipping_address(),
            'payment_method': 'CRYPTO',
        }
        resp = self.client.post('/api/v1/checkout/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('payment_method', resp.json()['error']['fields'])

    def test_invalid_product_uuid_returns_error(self):
        payload = {
            'items': [{'id': 'not-a-uuid', 'quantity': 1}],
            'shipping_address': valid_shipping_address(),
        }
        resp = self.client.post('/api/v1/checkout/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_cart_lines_return_error(self):
        line = {'id': str(self.product.id), 'quantity': 1}
        payload = {
            'items': [line, dict(line)],
            'shipping_address': valid_shipping_address(),
        }
        resp = self.client.post('/api/v1/checkout/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Duplicate cart line', str(resp.json()))

    def test_insufficient_stock_returns_standard_error(self):
        payload = {
            'items': [{'id': str(self.product.id), 'quantity': 25}],
            'shipping_address': valid_shipping_address(),
        }
        resp = self.client.post('/api/v1/checkout/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        data = resp.json()
        self.assertIn('error', data)
        self.assertEqual(data['error']['code'], ErrorCode.INSUFFICIENT_STOCK)
        self.assertIn('request_id', data['error'])

    def test_invalid_coupon_returns_standard_error(self):
        payload = {
            'items': [{'id': str(self.product.id), 'quantity': 1}],
            'coupon_code': 'NOT_A_VALID_COUPON_123',
            'shipping_address': valid_shipping_address(),
        }
        resp = self.client.post('/api/v1/checkout/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        data = resp.json()
        self.assertEqual(data['error']['code'], ErrorCode.INVALID_COUPON)

    def test_successful_checkout_response_format(self):
        payload = {
            'items': [{'id': str(self.product.id), 'quantity': 1}],
            'shipping_address': valid_shipping_address(city='Pune'),
            'payment_method': 'COD'
        }
        resp = self.client.post('/api/v1/checkout/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()

        # Follows standard success format: { "data": {...}, "meta": { "request_id": "..." } }
        self.assertIn('data', data)
        self.assertIn('meta', data)
        self.assertIn('request_id', data['meta'])
        self.assertIn('order_id', data['data'])
        self.assertIn('order_number', data['data'])
        # 799.00 < 999.00 threshold, so standard shipping is 99.00 -> total = 898.00
        self.assertEqual(data['data']['subtotal'], "799.00")
        self.assertEqual(data['data']['shipping_cost'], "99.00")
        self.assertEqual(data['data']['total'], "898.00")
