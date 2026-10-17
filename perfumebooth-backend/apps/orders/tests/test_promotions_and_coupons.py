"""
Comprehensive Tests for Discounts & Promotions (1-20) and Coupon System (21-39).
"""
import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from apps.orders.models import Coupon, CouponRedemption, Promotion, Order
from apps.orders.promotions import PromotionService
from apps.shop.models import Product
from apps.checkout.services.pricing_service import PricingService, CalculatedLineItem
from apps.checkout.exceptions import InvalidCouponException

User = get_user_model()


class DiscountsAndPromotionsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='shopper@example.com',
            first_name='Shopper',
            last_name='User',
            password='Password123!',
        )
        self.user.tags = ['vip']
        self.user.save()

        self.prod_luxury = Product.objects.create(
            title='Royal Oud Luxury',
            slug='royal-oud-luxury',
            sku='RO-001',
            price=Decimal('2000.00'),
            attributes={'brand': 'Al Haramain', 'category': 'Perfumes'}
        )
        self.prod_deo = Product.objects.create(
            title='Fresh Deo Stick',
            slug='fresh-deo-stick',
            sku='FDS-001',
            price=Decimal('500.00'),
            attributes={'brand': 'Nivea', 'category': 'Deodorants'}
        )

        self.item_luxury = CalculatedLineItem(
            product=self.prod_luxury,
            variant=None,
            quantity=1,
            unit_price=Decimal('2000.00'),
            line_total=Decimal('2000.00')
        )
        self.item_deo = CalculatedLineItem(
            product=self.prod_deo,
            variant=None,
            quantity=2,
            unit_price=Decimal('500.00'),
            line_total=Decimal('1000.00')
        )

    # 1-4: Promotion Management, Discount Rules, Percentage & Fixed
    def test_percentage_and_fixed_promotion_rules(self):
        promo_pct = Promotion.objects.create(
            name='Summer 20% Off Storewide',
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value=Decimal('20.00'),
            target_type=Promotion.TargetType.ALL,
            priority=10
        )
        res = PromotionService.calculate_promotions([self.item_luxury], Decimal('2000.00'))
        self.assertEqual(res['discount_amount'], Decimal('400.00'))
        self.assertEqual(len(res['applied_promotions']), 1)

        promo_pct.delete()

        # Fixed amount discount
        Promotion.objects.create(
            name='Flat 300 Off',
            discount_type=Promotion.DiscountType.FIXED,
            discount_value=Decimal('300.00'),
            target_type=Promotion.TargetType.ALL,
            priority=10
        )
        res_fixed = PromotionService.calculate_promotions([self.item_luxury], Decimal('2000.00'))
        self.assertEqual(res_fixed['discount_amount'], Decimal('300.00'))

    # 5-8: Targeting by Category, Brand, Product, and Customer Group
    def test_promotion_targeting_types(self):
        # Category target
        promo_cat = Promotion.objects.create(
            name='Perfumes Category Special',
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value=Decimal('10.00'),
            target_type=Promotion.TargetType.CATEGORY,
            target_values=['Perfumes'],
            priority=5
        )
        # Should discount luxury (2000 * 10% = 200) but not deo
        res = PromotionService.calculate_promotions([self.item_luxury, self.item_deo], Decimal('3000.00'))
        self.assertEqual(res['discount_amount'], Decimal('200.00'))
        promo_cat.delete()

        # Brand target
        promo_brand = Promotion.objects.create(
            name='Al Haramain Brand Sale',
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value=Decimal('15.00'),
            target_type=Promotion.TargetType.BRAND,
            target_values=['Al Haramain'],
            priority=5
        )
        res_brand = PromotionService.calculate_promotions([self.item_luxury, self.item_deo], Decimal('3000.00'))
        self.assertEqual(res_brand['discount_amount'], Decimal('300.00'))
        promo_brand.delete()

        # Specific Product target
        promo_prod = Promotion.objects.create(
            name='Royal Oud Flash Discount',
            discount_type=Promotion.DiscountType.FIXED,
            discount_value=Decimal('500.00'),
            target_type=Promotion.TargetType.PRODUCT,
            target_values=['royal-oud-luxury'],
            priority=5
        )
        res_prod = PromotionService.calculate_promotions([self.item_luxury, self.item_deo], Decimal('3000.00'))
        self.assertEqual(res_prod['discount_amount'], Decimal('500.00'))
        promo_prod.delete()

        # Customer Group target
        promo_vip = Promotion.objects.create(
            name='VIP Club Exclusive 25%',
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value=Decimal('25.00'),
            target_type=Promotion.TargetType.CUSTOMER_GROUP,
            target_values=['vip'],
            priority=5
        )
        # With VIP user
        res_vip = PromotionService.calculate_promotions([self.item_luxury], Decimal('2000.00'), user=self.user)
        self.assertEqual(res_vip['discount_amount'], Decimal('500.00'))
        # Anonymous or non-VIP
        res_anon = PromotionService.calculate_promotions([self.item_luxury], Decimal('2000.00'), user=None)
        self.assertEqual(res_anon['discount_amount'], Decimal('0.00'))

    # 9-10: Minimum Order & Maximum Discount Cap
    def test_promotion_min_order_and_max_discount(self):
        Promotion.objects.create(
            name='Big Spender 50% Off Capped',
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value=Decimal('50.00'),
            target_type=Promotion.TargetType.ALL,
            min_order_value=Decimal('2500.00'),
            max_discount=Decimal('600.00'),
            priority=10
        )
        # Cart total 2000 < min_order_value 2500 -> 0 discount
        res_below = PromotionService.calculate_promotions([self.item_luxury], Decimal('2000.00'))
        self.assertEqual(res_below['discount_amount'], Decimal('0.00'))

        # Cart total 3000 >= 2500 -> 50% of 2000 is 1000, capped at 600
        res_above = PromotionService.calculate_promotions([self.item_luxury], Decimal('3000.00'))
        self.assertEqual(res_above['discount_amount'], Decimal('600.00'))

    # 11-15: Scheduled Promotion, Start/End Dates, Activation/Deactivation
    def test_promotion_scheduling_and_activation(self):
        now = timezone.now()
        # Future promotion
        promo = Promotion.objects.create(
            name='Future Promo',
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value=Decimal('30.00'),
            start_date=now + timedelta(days=2),
            end_date=now + timedelta(days=5),
            is_active=True
        )
        self.assertNotIn(promo, PromotionService.get_active_promotions())

        # Expired promotion
        promo.start_date = now - timedelta(days=5)
        promo.end_date = now - timedelta(days=1)
        promo.save()
        self.assertNotIn(promo, PromotionService.get_active_promotions())

        # Active current promotion
        promo.end_date = now + timedelta(days=2)
        promo.save()
        self.assertIn(promo, PromotionService.get_active_promotions())

        # Deactivated promotion
        promo.is_active = False
        promo.save()
        self.assertNotIn(promo, PromotionService.get_active_promotions())

    # 16-19: Priority & Conflict Resolution, Combination Rules
    def test_promotion_priority_conflict_resolution_and_combination(self):
        promo_low = Promotion.objects.create(
            name='Storewide 10%',
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value=Decimal('10.00'),
            target_type=Promotion.TargetType.ALL,
            priority=1
        )
        promo_high = Promotion.objects.create(
            name='Oud 30% Flash',
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value=Decimal('30.00'),
            target_type=Promotion.TargetType.PRODUCT,
            target_values=['royal-oud-luxury'],
            priority=100
        )
        # High priority should win over low priority
        res = PromotionService.calculate_promotions([self.item_luxury], Decimal('2000.00'))
        self.assertEqual(res['discount_amount'], Decimal('600.00'))
        self.assertEqual(res['applied_promotions'][0]['id'], str(promo_high.id))

        # Test Exclusive combination rule preventing coupons
        promo_high.combination_rule = Promotion.CombinationRule.EXCLUSIVE
        promo_high.save()

        # In PricingService.calculate_order_totals, coupon + exclusive promotion raises InvalidCouponException
        Coupon.objects.create(code='EXTRA10', discount_value=Decimal('10.00'))
        with self.assertRaises(InvalidCouponException):
            PricingService.calculate_order_totals(
                line_items=[self.item_luxury],
                coupon_code='EXTRA10'
            )

    # 20: Flash Sale
    def test_flash_sale_flag(self):
        now = timezone.now()
        promo_flash = Promotion.objects.create(
            name='Midnight Flash Sale',
            discount_type=Promotion.DiscountType.PERCENTAGE,
            discount_value=Decimal('40.00'),
            target_type=Promotion.TargetType.ALL,
            is_flash_sale=True,
            start_date=now - timedelta(hours=1),
            end_date=now + timedelta(hours=3),
            priority=50
        )
        self.assertTrue(promo_flash.is_flash_sale)
        active = PromotionService.get_active_promotions()
        self.assertTrue(any(p.is_flash_sale for p in active))


class CouponSystemTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='customer@example.com',
            first_name='John',
            last_name='Doe',
            password='Password123!',
        )
        self.prod = Product.objects.create(
            title='Amber Oud',
            slug='amber-oud',
            sku='AO-100',
            price=Decimal('1500.00'),
            attributes={'category': 'Perfumes'}
        )
        self.item = CalculatedLineItem(
            product=self.prod,
            variant=None,
            quantity=1,
            unit_price=Decimal('1500.00'),
            line_total=Decimal('1500.00')
        )

    # 21-27: Coupon Validation, Expiration, Activation
    def test_coupon_validation_and_expiration(self):
        now = timezone.now()
        coupon = Coupon.objects.create(
            code='SAVE100',
            discount_type=Coupon.DiscountType.FIXED,
            discount_value=Decimal('100.00'),
            end_date=now - timedelta(days=1),
            is_active=True
        )
        # Expired
        with self.assertRaises(InvalidCouponException) as ctx:
            PricingService.validate_and_calculate_coupon('SAVE100', Decimal('1500.00'))
        self.assertIn("expired", str(ctx.exception.message).lower())

        # Inactive
        coupon.end_date = now + timedelta(days=5)
        coupon.is_active = False
        coupon.save()
        with self.assertRaises(InvalidCouponException):
            PricingService.validate_and_calculate_coupon('SAVE100', Decimal('1500.00'))

        # Valid
        coupon.is_active = True
        coupon.save()
        res = PricingService.validate_and_calculate_coupon('SAVE100', Decimal('1500.00'))
        self.assertEqual(res['discount_amount'], Decimal('100.00'))

    # 28-29: Minimum Order Requirement & Maximum Discount Cap
    def test_min_order_and_max_discount(self):
        Coupon.objects.create(
            code='BIGDEAL',
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal('20.00'),
            min_order_value=Decimal('2000.00'),
            max_discount=Decimal('250.00')
        )
        # Below min order
        with self.assertRaises(InvalidCouponException) as ctx:
            PricingService.validate_and_calculate_coupon('BIGDEAL', Decimal('1500.00'))
        self.assertIn("minimum order", str(ctx.exception.message).lower())

        # Above min order, capped discount (20% of 3000 = 600, capped at 250)
        res = PricingService.validate_and_calculate_coupon('BIGDEAL', Decimal('3000.00'))
        self.assertEqual(res['discount_amount'], Decimal('250.00'))

    # 30-32: Product, Category, and Customer Restrictions
    def test_coupon_restrictions(self):
        # Product restriction
        Coupon.objects.create(
            code='EXCLUSIVEPROD',
            discount_type=Coupon.DiscountType.FIXED,
            discount_value=Decimal('200.00'),
            product_restrictions=['different-product-slug']
        )
        with self.assertRaises(InvalidCouponException) as ctx:
            PricingService.validate_and_calculate_coupon(
                'EXCLUSIVEPROD', Decimal('1500.00'), line_items=[self.item]
            )
        self.assertIn("not valid for any items", str(ctx.exception.message).lower())

        # Category restriction
        Coupon.objects.create(
            code='DEOSONLY',
            discount_type=Coupon.DiscountType.FIXED,
            discount_value=Decimal('100.00'),
            category_restrictions=['Deodorants']
        )
        with self.assertRaises(InvalidCouponException) as ctx:
            PricingService.validate_and_calculate_coupon(
                'DEOSONLY', Decimal('1500.00'), line_items=[self.item]
            )
        self.assertIn("not valid for the categories", str(ctx.exception.message).lower())

        # Customer restriction
        Coupon.objects.create(
            code='VIPONLY',
            discount_type=Coupon.DiscountType.FIXED,
            discount_value=Decimal('100.00'),
            customer_restrictions=['exclusive_vip@example.com']
        )
        with self.assertRaises(InvalidCouponException) as ctx:
            PricingService.validate_and_calculate_coupon(
                'VIPONLY', Decimal('1500.00'), customer_email='intruder@example.com'
            )
        self.assertIn("restricted to selected customers", str(ctx.exception.message).lower())

        # Correct customer passes
        res = PricingService.validate_and_calculate_coupon(
            'VIPONLY', Decimal('1500.00'), customer_email='exclusive_vip@example.com'
        )
        self.assertEqual(res['discount_amount'], Decimal('100.00'))

    # 33-38: First-Order Restriction, Usage Limits, Per-Customer Tracking & Abuse Prevention
    def test_coupon_usage_limits_and_abuse_prevention(self):
        coupon = Coupon.objects.create(
            code='ONETIME',
            discount_type=Coupon.DiscountType.FIXED,
            discount_value=Decimal('150.00'),
            usage_limit=1,
            per_customer_limit=1,
            first_order_only=True
        )

        # First order passes
        res = PricingService.validate_and_calculate_coupon(
            'ONETIME', Decimal('1500.00'), user=self.user, customer_email=self.user.email
        )
        self.assertEqual(res['discount_amount'], Decimal('150.00'))

        # Record redemption audit entry
        order = Order.objects.create(
            user=self.user,
            order_number='PB-TEST-1',
            subtotal=Decimal('1500.00'),
            total=Decimal('1350.00'),
            customer_email=self.user.email,
            coupon_code='ONETIME'
        )
        CouponRedemption.objects.create(
            coupon=coupon,
            user=self.user,
            order=order,
            customer_email=self.user.email,
            discount_amount=Decimal('150.00')
        )
        coupon.times_used = 1
        coupon.save()

        # Global usage limit check
        with self.assertRaises(InvalidCouponException) as ctx:
            PricingService.validate_and_calculate_coupon('ONETIME', Decimal('1500.00'))
        self.assertIn("usage limit has been reached", str(ctx.exception.message).lower())

        # Per customer limit / first order limit check
        coupon.usage_limit = 100
        coupon.save()
        with self.assertRaises(InvalidCouponException) as ctx:
            PricingService.validate_and_calculate_coupon(
                'ONETIME', Decimal('1500.00'), user=self.user, customer_email=self.user.email
            )
        self.assertTrue(
            "already redeemed" in str(ctx.exception.message).lower()
            or "first order" in str(ctx.exception.message).lower()
        )
