"""
Pricing Service — Server-Authoritative Price, Coupon, Shipping and Total Calculations
Strictly uses Python Decimal to prevent floating-point rounding errors.
Disregards all client-provided prices, discounts, and shipping amounts.
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Dict, Any

from apps.shop.models import Product, ProductVariant
from core.money import to_decimal
from .inventory_service import LockedStockItem
from ..exceptions import InvalidCouponException

TWO_PLACES = Decimal('0.01')

FREE_SHIPPING_THRESHOLD = Decimal('999.00')
STANDARD_SHIPPING_FEE = Decimal('99.00')


@dataclass
class CalculatedLineItem:
    product: Product
    variant: Optional[ProductVariant]
    quantity: int
    unit_price: Decimal
    line_total: Decimal


@dataclass
class OrderTotals:
    subtotal: Decimal
    discount_amount: Decimal
    shipping_cost: Decimal
    tax: Decimal
    total: Decimal
    coupon_code: str
    free_shipping: bool
    promotional_discount: Decimal = Decimal('0.00')
    coupon_discount: Decimal = Decimal('0.00')
    applied_promotions: Optional[List[Dict[str, Any]]] = None


class PricingService:
    """
    Computes authoritative prices, server-verified coupon discounts,
    shipping charges, promotional campaign discounts, and final order totals.
    """

    @classmethod
    def calculate_line_price(cls, product: Product, variant: Optional[ProductVariant] = None) -> Decimal:
        """Fetch authoritative price directly from database record."""
        if variant and variant.price is not None:
            return to_decimal(variant.price).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        return to_decimal(product.price).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    @classmethod
    def build_line_items(cls, locked_items: List[LockedStockItem]) -> List[CalculatedLineItem]:
        """Convert locked stock items into calculated line items with authoritative prices."""
        calculated: List[CalculatedLineItem] = []
        for item in locked_items:
            unit_price = cls.calculate_line_price(item.product, item.variant)
            line_total = (unit_price * item.quantity).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            calculated.append(CalculatedLineItem(
                product=item.product,
                variant=item.variant,
                quantity=item.quantity,
                unit_price=unit_price,
                line_total=line_total
            ))
        return calculated

    @classmethod
    def validate_and_calculate_coupon(
        cls,
        coupon_code: str,
        subtotal: Decimal,
        user=None,
        customer_email: Optional[str] = None,
        line_items: Optional[List[CalculatedLineItem]] = None
    ) -> Dict[str, Any]:
        """
        Validate coupon code and compute discount amount.
        Enforces:
        - Date bounds (start_date, end_date)
        - Global usage limit (usage_limit vs times_used)
        - Per-customer usage limit (per_customer_limit vs CouponRedemption)
        - First-order restriction (first_order_only)
        - Customer email restriction whitelist (customer_restrictions)
        - Product restriction whitelist (product_restrictions)
        - Category restriction whitelist (category_restrictions)
        - Min order value requirement and max discount capping
        """
        from django.utils import timezone
        from apps.orders.models import Coupon, CouponRedemption, Order

        normalized = (coupon_code or '').strip().upper()
        if not normalized:
            return {
                'valid': True,
                'code': '',
                'discount_amount': Decimal('0.00'),
                'free_shipping': False,
                'coupon': None
            }

        # 1. Check database-backed Coupon
        coupon = Coupon.objects.filter(code__iexact=normalized).first()
        if coupon:
            if not coupon.is_active:
                raise InvalidCouponException(code=normalized, message="This coupon is disabled.")
            now = timezone.now()
            if coupon.start_date and now < coupon.start_date:
                raise InvalidCouponException(code=normalized, message="This coupon promotion has not started yet.")
            if coupon.end_date and now > coupon.end_date:
                raise InvalidCouponException(code=normalized, message="This coupon has expired.")
            if coupon.min_order_value and subtotal < coupon.min_order_value:
                raise InvalidCouponException(code=normalized, message=f"Minimum order of ₹{coupon.min_order_value} required for this coupon.")
            if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
                raise InvalidCouponException(code=normalized, message="Coupon usage limit has been reached.")

            authenticated = bool(user and getattr(user, 'is_authenticated', False))
            if authenticated:
                email = (getattr(user, 'email', '') or '').strip().lower()
            else:
                email = (customer_email or '').strip().lower()

            if coupon.first_order_only and not email:
                raise InvalidCouponException(code=normalized, message="A customer email is required for this coupon.")

            # Customer whitelist restriction
            if coupon.customer_restrictions:
                allowed_emails = [str(e).strip().lower() for e in coupon.customer_restrictions if str(e).strip()]
                if allowed_emails and (not email or email not in allowed_emails):
                    raise InvalidCouponException(code=normalized, message="This coupon is restricted to selected customers.")

            # Per-customer usage limit check via CouponRedemption
            if coupon.per_customer_limit and email:
                from django.db.models import Q
                identity = Q(customer_email__iexact=email)
                if authenticated:
                    identity |= Q(user=user)
                user_filter = CouponRedemption.objects.filter(identity, coupon=coupon)
                if user_filter.count() >= coupon.per_customer_limit:
                    raise InvalidCouponException(
                        code=normalized,
                        message=f"You have already redeemed this coupon {coupon.per_customer_limit} time(s)."
                    )

            # First-order restriction
            if coupon.first_order_only:
                from django.db.models import Q
                order_query = Q()
                if authenticated:
                    order_query |= Q(user=user)
                if email:
                    order_query |= Q(customer_email__iexact=email)

                has_previous_orders = Order.objects.filter(order_query).exclude(status=Order.Status.CANCELLED).exists()
                if has_previous_orders:
                    raise InvalidCouponException(code=normalized, message="This coupon is only valid for your first order.")

            # Product & category whitelist restriction calculation base
            discount_base_subtotal = subtotal
            if line_items:
                matched_items = line_items

                if coupon.product_restrictions:
                    allowed_prods = set(str(p).strip().lower() for p in coupon.product_restrictions if str(p).strip())
                    if allowed_prods:
                        matched_items = [
                            it for it in matched_items
                            if str(it.product.id).lower() in allowed_prods or str(it.product.slug).lower() in allowed_prods
                        ]
                        if not matched_items:
                            raise InvalidCouponException(
                                code=normalized,
                                message="This coupon is not valid for any items currently in your cart."
                            )

                if coupon.category_restrictions:
                    allowed_cats = [str(c).strip().lower() for c in coupon.category_restrictions if str(c).strip()]
                    if allowed_cats:
                        def matches_cat(item: CalculatedLineItem) -> bool:
                            attrs = item.product.attributes or {}
                            cat = str(attrs.get('category') or attrs.get('productType') or attrs.get('type') or '').strip().lower()
                            return any(ac in cat or cat in ac for ac in allowed_cats)

                        matched_items = [it for it in matched_items if matches_cat(it)]
                        if not matched_items:
                            raise InvalidCouponException(
                                code=normalized,
                                message="This coupon is not valid for the categories currently in your cart."
                            )

                if coupon.product_restrictions or coupon.category_restrictions:
                    discount_base_subtotal = sum((it.line_total for it in matched_items), Decimal('0.00')).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

            if coupon.discount_type == Coupon.DiscountType.FREE_SHIPPING:
                return {
                    'valid': True,
                    'code': normalized,
                    'discount_amount': Decimal('0.00'),
                    'free_shipping': True,
                    'coupon': coupon
                }
            elif coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
                amount = ((discount_base_subtotal * coupon.discount_value) / Decimal('100')).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
                if coupon.max_discount:
                    amount = min(amount, coupon.max_discount)
                return {
                    'valid': True,
                    'code': normalized,
                    'discount_amount': amount,
                    'free_shipping': False,
                    'coupon': coupon
                }
            elif coupon.discount_type == Coupon.DiscountType.FIXED:
                amount = min(coupon.discount_value, discount_base_subtotal).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
                return {
                    'valid': True,
                    'code': normalized,
                    'discount_amount': amount,
                    'free_shipping': False,
                    'coupon': coupon
                }

            return {
                'valid': True,
                'code': '',
                'discount_amount': Decimal('0.00'),
                'free_shipping': False,
                'coupon': None
            }

        # Only merchant-managed database coupons are valid.
        raise InvalidCouponException(code=normalized)

    @classmethod
    def calculate_shipping(cls, subtotal: Decimal, coupon_info: Dict[str, Any]) -> Decimal:
        """
        Compute shipping charge.
        Free shipping is granted if subtotal meets the threshold or a free shipping coupon was applied.
        Never trusts client-supplied shipping amounts.
        """
        if coupon_info.get('free_shipping') or subtotal >= FREE_SHIPPING_THRESHOLD:
            return Decimal('0.00')
        return STANDARD_SHIPPING_FEE

    @classmethod
    def calculate_order_totals(
        cls,
        line_items: List[CalculatedLineItem],
        coupon_code: str,
        shipping_address: Optional[dict] = None,
        user=None,
        customer_email: Optional[str] = None
    ) -> OrderTotals:
        """
        Compute the final authoritative financial totals for checkout.
        Combines automated promotions and coupons, enforcing combination rules.
        """
        subtotal = sum((item.line_total for item in line_items), Decimal('0.00')).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

        # 1. Automated Promotions Calculation
        from apps.orders.promotions import PromotionService
        promo_res = PromotionService.calculate_promotions(line_items, subtotal, user=user)
        promotional_discount = promo_res.get('discount_amount', Decimal('0.00'))
        applied_promotions = promo_res.get('applied_promotions', [])
        has_exclusive = promo_res.get('has_exclusive', False)

        normalized_coupon = (coupon_code or '').strip().upper()
        if normalized_coupon and has_exclusive:
            raise InvalidCouponException(
                code=normalized_coupon,
                message="An exclusive promotion is applied to your cart and cannot be combined with coupons."
            )

        resolved_email = customer_email or (shipping_address.get('email') if shipping_address else None)
        remaining_subtotal = max(subtotal - promotional_discount, Decimal('0.00'))

        coupon_info = cls.validate_and_calculate_coupon(
            coupon_code=normalized_coupon,
            subtotal=remaining_subtotal,
            user=user,
            customer_email=resolved_email,
            line_items=line_items
        )
        coupon_discount = coupon_info['discount_amount']
        total_discount = (promotional_discount + coupon_discount).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

        shipping_cost = cls.calculate_shipping(subtotal, coupon_info)
        tax = Decimal('0.00')

        total = max(subtotal - total_discount + shipping_cost + tax, Decimal('0.00')).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

        return OrderTotals(
            subtotal=subtotal,
            discount_amount=total_discount,
            shipping_cost=shipping_cost,
            tax=tax,
            total=total,
            coupon_code=coupon_info['code'],
            free_shipping=coupon_info.get('free_shipping', False),
            promotional_discount=promotional_discount,
            coupon_discount=coupon_discount,
            applied_promotions=applied_promotions
        )
