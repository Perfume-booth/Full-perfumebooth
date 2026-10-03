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

# Authoritative active coupon discounts (percentage)
ACTIVE_COUPONS = {
    'SAVE10': Decimal('10'),
    'BLOOM15': Decimal('15'),
    'MEN15': Decimal('15'),
    'WOMEN15': Decimal('15'),
}

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


class PricingService:
    """
    Computes authoritative prices, server-verified coupon discounts,
    shipping charges, and final order totals.
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
    def validate_and_calculate_coupon(cls, coupon_code: str, subtotal: Decimal) -> Dict[str, Any]:
        """
        Validate coupon code and compute discount amount.
        Raises InvalidCouponException if a non-empty coupon code is invalid.
        """
        normalized = (coupon_code or '').strip().upper()
        if not normalized:
            return {
                'valid': True,
                'code': '',
                'discount_amount': Decimal('0.00'),
                'free_shipping': False
            }

        if normalized == 'FREESHIP':
            return {
                'valid': True,
                'code': normalized,
                'discount_amount': Decimal('0.00'),
                'free_shipping': True
            }

        percentage = ACTIVE_COUPONS.get(normalized)
        if percentage is None:
            raise InvalidCouponException(code=normalized)

        discount_amount = ((subtotal * percentage) / Decimal('100')).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        return {
            'valid': True,
            'code': normalized,
            'discount_amount': discount_amount,
            'free_shipping': False
        }

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
    def calculate_order_totals(cls, line_items: List[CalculatedLineItem],
                               coupon_code: str,
                               shipping_address: Optional[dict] = None) -> OrderTotals:
        """
        Compute the final authoritative financial totals for the checkout.
        """
        subtotal = sum((item.line_total for item in line_items), Decimal('0.00')).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        coupon_info = cls.validate_and_calculate_coupon(coupon_code, subtotal)
        discount_amount = coupon_info['discount_amount']
        shipping_cost = cls.calculate_shipping(subtotal, coupon_info)
        tax = Decimal('0.00')

        total = max(subtotal - discount_amount + shipping_cost + tax, Decimal('0.00')).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

        return OrderTotals(
            subtotal=subtotal,
            discount_amount=discount_amount,
            shipping_cost=shipping_cost,
            tax=tax,
            total=total,
            coupon_code=coupon_info['code'],
            free_shipping=coupon_info.get('free_shipping', False)
        )
