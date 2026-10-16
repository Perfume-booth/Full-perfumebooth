"""
Orders Domain Models
──────────────────────
Order     — purchase record tied to a user and payment intent
OrderItem — line items within an order
"""
import uuid
from django.db import models
from django.conf import settings

from apps.shop.models import Product, ProductVariant


class Order(models.Model):

    class Status(models.TextChoices):
        PENDING    = 'Pending',    'Pending'
        PAID       = 'Paid',       'Paid'
        PROCESSING = 'Processing', 'Processing'
        SHIPPED    = 'Shipped',    'Shipped'
        DELIVERED  = 'Delivered',  'Delivered'
        CANCELLED  = 'Cancelled',  'Cancelled'
        REFUNDED   = 'Refunded',   'Refunded'

    class PaymentMethod(models.TextChoices):
        COD = 'COD', 'Cash on Delivery'
        RAZORPAY = 'RAZORPAY', 'Razorpay'

    class PaymentStatus(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        AUTHORIZED = 'Authorized', 'Authorized'
        PAID = 'Paid', 'Paid'
        FAILED = 'Failed', 'Failed'
        REFUNDED = 'Refunded', 'Refunded'
        PARTIALLY_REFUNDED = 'Partially Refunded', 'Partially Refunded'
        CANCELLED = 'Cancelled', 'Cancelled'

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
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')

    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.COD,
        db_index=True,
    )
    payment_status = models.CharField(
        max_length=30,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )

    # Payment gateway reference (Razorpay payment_intent / Stripe PaymentIntent ID)
    payment_intent_id = models.CharField(
        max_length=255, blank=True, null=True, unique=True, db_index=True
    )

    # Shipping address snapshot
    shipping_address = models.JSONField(default=dict)
    customer_email = models.EmailField(blank=True, default='', db_index=True)
    customer_phone = models.CharField(max_length=30, blank=True, default='')
    coupon_code = models.CharField(max_length=50, blank=True, default='', db_index=True)

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


class CheckoutRequest(models.Model):
    """Durable retry key; the same key must describe the same checkout."""
    key = models.CharField(max_length=64, primary_key=True)
    fingerprint = models.CharField(max_length=64)
    response = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)


class PaymentAttempt(models.Model):
    order = models.OneToOneField(Order, on_delete=models.PROTECT, related_name='payment_attempt')
    gateway_order_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    status = models.CharField(max_length=30, default='new', db_index=True)
    # new -> creating -> ready -> paid; ambiguous creates are never blindly retried.
    last_error = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PaymentEvent(models.Model):
    event_id = models.CharField(max_length=255, unique=True)
    fingerprint = models.CharField(max_length=64)
    payment_id = models.CharField(max_length=100, db_index=True)
    order = models.ForeignKey(Order, on_delete=models.PROTECT)
    outcome = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)


class PaymentOutbox(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT)
    kind = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default='pending', db_index=True)
    last_error = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['order', 'kind'], name='unique_paid_order_effect')]


class Shipment(models.Model):
    """Provider-neutral fulfilment record for an order."""

    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        AWB_ASSIGNED = 'AWB Assigned', 'AWB Assigned'
        SHIPPED = 'Shipped', 'Shipped'
        IN_TRANSIT = 'In Transit', 'In Transit'
        OUT_FOR_DELIVERY = 'Out for Delivery', 'Out for Delivery'
        DELIVERED = 'Delivered', 'Delivered'
        FAILED = 'Failed', 'Failed'
        CANCELLED = 'Cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='shipments')
    provider = models.CharField(max_length=50, default='shiprocket', db_index=True)
    provider_order_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    provider_shipment_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    awb_code = models.CharField(max_length=100, blank=True, default='', db_index=True)
    courier_name = models.CharField(max_length=150, blank=True, default='')
    tracking_url = models.URLField(max_length=500, blank=True, default='')
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING, db_index=True)
    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders_shipment'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'provider_shipment_id'],
                condition=~models.Q(provider_shipment_id=''),
                name='unique_provider_shipment_id',
            ),
        ]

    def __str__(self) -> str:
        return f'{self.provider}: {self.order.order_number} — {self.status}'


class OrderItem(models.Model):
    """A single product line within an order."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items', db_index=True
    )
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, related_name='order_items'
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
    )
    product_title = models.CharField(max_length=500, blank=True, default='')
    variant_title = models.CharField(max_length=255, blank=True, default='')
    sku = models.CharField(max_length=200, blank=True, default='')
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'orders_order_item'
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    @property
    def price(self):
        """Alias for unit_price to support item.price access safely."""
        return self.unit_price

    @property
    def line_total(self) -> float:
        return float(self.unit_price) * self.quantity

    def __str__(self) -> str:
        product_name = self.product_title or (self.product.title if self.product else 'Deleted Product')
        return f'{product_name} × {self.quantity}'


class AbandonedCart(models.Model):
    """Tracks abandoned carts for recovery workflows."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='abandoned_carts'
    )
    email = models.EmailField(db_index=True)
    cart_data = models.JSONField(default=dict)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    recovered = models.BooleanField(default=False)
    reminder_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders_abandoned_cart'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"AbandonedCart ({self.email}) - {'Recovered' if self.recovered else 'Pending'}"


class Coupon(models.Model):
    """
    Promotions & Discounts Coupon Model
    """
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Percentage'
        FIXED = 'fixed', 'Fixed Amount'
        FREE_SHIPPING = 'free_shipping', 'Free Shipping'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True, default='')
    discount_type = models.CharField(
        max_length=20, choices=DiscountType.choices, default=DiscountType.PERCENTAGE
    )
    discount_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='Percentage value (e.g. 15 for 15%) or Fixed amount (e.g. 200)'
    )
    min_order_value = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='Minimum subtotal required to apply this coupon'
    )
    max_discount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Maximum discount cap for percentage discounts'
    )
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True, db_index=True)
    usage_limit = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Global max redemptions allowed (null for unlimited)'
    )
    times_used = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    first_order_only = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders_coupon'
        ordering = ['-created_at']
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'

    def __str__(self) -> str:
        return f"{self.code} ({self.discount_type}: {self.discount_value})"

