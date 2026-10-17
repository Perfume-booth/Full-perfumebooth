"""
Promotion Service — Storewide, Category, Brand, Product & Customer Group Promotions
Handles Conflict Resolution, Priority Ordering, and Flash Sales.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
from django.utils import timezone
from django.db.models import Q
from core.money import to_decimal
from .models import Promotion

TWO_PLACES = Decimal('0.01')


class PromotionService:
    """
    Evaluates active promotional campaigns against cart items and order subtotals.
    Enforces priority, conflict resolution, and combination rules.
    """

    @classmethod
    def get_active_promotions(cls) -> List[Promotion]:
        """Fetch all active, valid promotions within current datetime window."""
        now = timezone.now()
        return list(
            Promotion.objects.filter(is_active=True)
            .filter(Q(start_date__isnull=True) | Q(start_date__lte=now))
            .filter(Q(end_date__isnull=True) | Q(end_date__gte=now))
            .order_by('-priority', '-discount_value')
        )

    @classmethod
    def evaluate_line_item(cls, item, promotions: List[Promotion], user=None) -> Optional[Promotion]:
        """
        Determines the single winning promotion for a given line item.
        Respects priority hierarchy and picks highest discount value upon conflict.
        """
        attrs = item.product.attributes or {}
        prod_id = str(item.product.id).lower()
        prod_slug = str(item.product.slug).lower()
        brand = str(attrs.get('brand') or attrs.get('vendor') or '').strip().lower()
        category = str(attrs.get('category') or attrs.get('productType') or attrs.get('type') or '').strip().lower()

        user_tags = []
        if user and getattr(user, 'is_authenticated', False):
            user_tags = [str(t).strip().lower() for t in getattr(user, 'tags', [])]

        matching_promos: List[Promotion] = []

        for promo in promotions:
            targets = [str(v).strip().lower() for v in (promo.target_values or [])]

            if promo.target_type == Promotion.TargetType.ALL:
                matching_promos.append(promo)
            elif promo.target_type == Promotion.TargetType.BRAND:
                if any(t in brand or brand in t for t in targets):
                    matching_promos.append(promo)
            elif promo.target_type == Promotion.TargetType.CATEGORY:
                if any(t in category or category in t for t in targets):
                    matching_promos.append(promo)
            elif promo.target_type == Promotion.TargetType.PRODUCT:
                if prod_id in targets or prod_slug in targets:
                    matching_promos.append(promo)
            elif promo.target_type == Promotion.TargetType.CUSTOMER_GROUP:
                if any(t in user_tags for t in targets):
                    matching_promos.append(promo)

        if not matching_promos:
            return None

        # Conflict resolution: sort by priority (descending), then discount value (descending)
        matching_promos.sort(key=lambda p: (p.priority, float(p.discount_value)), reverse=True)
        return matching_promos[0]

    @classmethod
    def calculate_promotions(cls, line_items, subtotal: Decimal, user=None) -> Dict[str, Any]:
        """
        Computes total promotional discount across all line items in the cart.
        Returns discount amount, applied promotions metadata, and combination flags.
        """
        active_promos = cls.get_active_promotions()
        if not active_promos or not line_items:
            return {
                'discount_amount': Decimal('0.00'),
                'applied_promotions': [],
                'has_exclusive': False,
            }

        total_discount = Decimal('0.00')
        applied_promo_map = {}

        for item in line_items:
            winning_promo = cls.evaluate_line_item(item, active_promos, user=user)
            if not winning_promo:
                continue

            # Minimum order value check
            if winning_promo.min_order_value and subtotal < winning_promo.min_order_value:
                continue

            line_subtotal = item.line_total
            if winning_promo.discount_type == Promotion.DiscountType.PERCENTAGE:
                item_discount = (line_subtotal * winning_promo.discount_value / Decimal('100')).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
                if winning_promo.max_discount:
                    item_discount = min(item_discount, winning_promo.max_discount)
            elif winning_promo.discount_type == Promotion.DiscountType.FIXED:
                item_discount = min(winning_promo.discount_value, line_subtotal).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            else:
                item_discount = Decimal('0.00')

            total_discount += item_discount
            applied_promo_map[str(winning_promo.id)] = winning_promo

        applied_list = [
            {
                'id': str(p.id),
                'name': p.name,
                'discount_type': p.discount_type,
                'discount_value': float(p.discount_value),
                'target_type': p.target_type,
                'is_flash_sale': p.is_flash_sale,
                'combination_rule': p.combination_rule,
            }
            for p in applied_promo_map.values()
        ]

        has_exclusive = any(
            p.combination_rule == Promotion.CombinationRule.EXCLUSIVE
            for p in applied_promo_map.values()
        )

        return {
            'discount_amount': total_discount.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
            'applied_promotions': applied_list,
            'has_exclusive': has_exclusive,
        }
