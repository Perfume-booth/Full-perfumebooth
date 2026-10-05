import uuid

from django.db import models


class InventoryReservation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        COMMITTED = 'Committed', 'Committed'
        RELEASED = 'Released', 'Released'
        EXPIRED = 'Expired', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='inventory_reservations')
    product = models.ForeignKey(
        'shop.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventory_reservations',
    )
    variant = models.ForeignKey(
        'shop.ProductVariant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventory_reservations',
    )
    quantity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    committed_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_reservation'
        ordering = ['created_at']
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gt=0), name='reservation_quantity_positive'),
            models.UniqueConstraint(
                fields=['order', 'product'],
                condition=models.Q(variant__isnull=True),
                name='unique_simple_product_reservation_per_order',
            ),
            models.UniqueConstraint(
                fields=['order', 'variant'],
                condition=models.Q(variant__isnull=False),
                name='unique_variant_reservation_per_order',
            ),
        ]

    def __str__(self):
        product_name = self.product.title if self.product else 'Deleted product'
        return f'{self.order.order_number}: {product_name} × {self.quantity} ({self.status})'


class InventoryMovement(models.Model):
    class Type(models.TextChoices):
        RESERVE = 'Reserve', 'Reserve'
        COMMIT = 'Commit', 'Commit Sale'
        RELEASE = 'Release', 'Release'
        EXPIRE = 'Expire', 'Expire'
        ADJUSTMENT = 'Adjustment', 'Manual Adjustment'
        RETURN = 'Return', 'Return'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    movement_type = models.CharField(max_length=20, choices=Type.choices, db_index=True)
    reservation = models.ForeignKey(
        InventoryReservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movements',
    )
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventory_movements',
    )
    product = models.ForeignKey(
        'shop.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventory_movements',
    )
    variant = models.ForeignKey(
        'shop.ProductVariant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventory_movements',
    )
    stock_delta = models.IntegerField(default=0)
    reserved_delta = models.IntegerField(default=0)
    stock_after = models.PositiveIntegerField()
    reserved_after = models.PositiveIntegerField()
    reason = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'inventory_movement'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.movement_type}: stock {self.stock_delta:+d}, reserved {self.reserved_delta:+d}'
