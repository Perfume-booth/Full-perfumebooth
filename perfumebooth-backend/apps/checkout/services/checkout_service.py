"""
Checkout Service — Transactional Order Placement Coordinator
Coordinates:
1. Product and variant resolution
2. Quantity validation
3. Inventory row locking
4. Server-authoritative price calculation
5. Coupon validation
6. Shipping and order total computation
7. Order and OrderItem creation
8. Inventory decrement
9. Result serialization
"""
import random
import datetime
from django.db import transaction

from apps.orders.models import Order, OrderItem
from core.money import format_money
from ..validators import CheckoutInput
from .inventory_service import InventoryService
from .pricing_service import PricingService


class CheckoutService:
    """
    Coordinates checkout business logic within an atomic database transaction.
    Guarantees that no price, discount, or shipping charge is trusted from the client.
    """

    @classmethod
    @transaction.atomic
    def process_checkout(cls, user, input_data: CheckoutInput) -> dict:
        """
        Execute the full checkout workflow transactionally.
        """
        # 1, 2, 3: Load products, variants, validate quantities, and lock inventory rows
        locked_items = InventoryService.lock_and_validate_stock(input_data.items)

        # 4: Calculate authoritative line item prices
        line_items = PricingService.build_line_items(locked_items)

        # 5, 6: Validate coupons, compute shipping fee and final total
        totals = PricingService.calculate_order_totals(
            line_items=line_items,
            coupon_code=input_data.coupon_code,
            shipping_address=input_data.shipping_address
        )

        # Generate unique order tracking number
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        rand = random.randint(1000, 9999)
        order_number = f'PB-{timestamp}-{rand}'

        # Prepare shipping address snapshot with payment details
        shipping_snapshot = dict(input_data.shipping_address)
        shipping_snapshot['payment_method'] = input_data.payment_method
        if totals.coupon_code:
            shipping_snapshot['applied_coupon'] = totals.coupon_code

        initial_status = Order.Status.PENDING
        if input_data.payment_method == 'COD':
            initial_status = Order.Status.PROCESSING

        # 7: Create the Order record
        order = Order.objects.create(
            user=user if user and user.is_authenticated else None,
            order_number=order_number,
            status=initial_status,
            subtotal=totals.subtotal,
            discount_amount=totals.discount_amount,
            shipping_amount=totals.shipping_cost,
            tax_amount=totals.tax,
            total=totals.total,
            currency='INR',
            payment_method=input_data.payment_method,
            payment_status=Order.PaymentStatus.PENDING,
            shipping_address=shipping_snapshot,
            customer_email=(
                input_data.shipping_address.get('email')
                or (user.email if user and user.is_authenticated else '')
            ),
            customer_phone=input_data.shipping_address.get('phone', ''),
        )

        # Create OrderItem records
        for item in line_items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                variant=item.variant,
                product_title=item.product.title,
                variant_title=item.variant.title if item.variant else '',
                sku=item.variant.sku if item.variant else item.product.sku,
                quantity=item.quantity,
                unit_price=item.unit_price
            )

        # 8: Decrement inventory stock levels
        InventoryService.decrement_stock(locked_items)

        # 9: Return structured checkout result
        return {
            'order_id': str(order.id),
            'order_number': order.order_number,
            'status': order.status,
            'subtotal': format_money(totals.subtotal),
            'discount_amount': format_money(totals.discount_amount),
            'shipping_cost': format_money(totals.shipping_cost),
            'tax': format_money(totals.tax),
            'total': format_money(totals.total),
            'items_count': sum(item.quantity for item in line_items),
            'payment_method': input_data.payment_method,
        }
