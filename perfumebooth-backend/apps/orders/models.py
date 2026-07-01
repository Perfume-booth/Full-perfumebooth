"""
Orders Domain Models
──────────────────────
Order     — purchase record tied to a user and payment intent
OrderItem — line items within an order
"""
import uuid
from django.db import models
from django.conf import settings

from apps.shop.models import Product


class Order(models.Model):

    class Status(models.TextChoices):
        PENDING    = 'Pending',    'Pending'
        PAID       = 'Paid',       'Paid'
        PROCESSING = 'Processing', 'Processing'
        SHIPPED    = 'Shipped',    'Shipped'
        DELIVERED  = 'Delivered',  'Delivered'
        CANCELLED  = 'Cancelled',  'Cancelled'
        REFUNDED   = 'Refunded',   'Refunded'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders',
        db_index=True,
    )
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    # Payment gateway reference (Razorpay payment_intent / Stripe PaymentIntent ID)
    payment_intent_id = models.CharField(
        max_length=255, blank=True, null=True, unique=True, db_index=True
    )

    # Shipping address snapshot
    shipping_address = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders_order'
        ordering = ['-created_at']
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        indexes = [
            models.Index(fields=['order_number'], name='order_number_idx'),
            models.Index(fields=['status'], name='order_status_idx'),
            models.Index(fields=['created_at'], name='order_created_idx'),
        ]

    def __str__(self) -> str:
        return f'Order #{self.order_number} — {self.status}'


class OrderItem(models.Model):
    """A single product line within an order."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items', db_index=True
    )
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, related_name='order_items'
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'orders_order_item'
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    @property
    def line_total(self) -> float:
        return float(self.unit_price) * self.quantity

    def __str__(self) -> str:
        product_name = self.product.title if self.product else 'Deleted Product'
        return f'{product_name} × {self.quantity}'
