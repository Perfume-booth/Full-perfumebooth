from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.checkout.exceptions import InsufficientStockException
from apps.shop.models import Inventory, ProductVariant

from .models import InventoryMovement, InventoryReservation


class InventoryReservationService:
    @staticmethod
    def _balances(reservation):
        if reservation.variant_id:
            record = ProductVariant.objects.only('stock_level', 'reserved_stock').get(pk=reservation.variant_id)
        else:
            record = Inventory.objects.only('stock_level', 'reserved_stock').get(product_id=reservation.product_id)
        return record.stock_level, record.reserved_stock

    @classmethod
    def _record(cls, reservation, movement_type, stock_delta, reserved_delta, reason=''):
        stock_after, reserved_after = cls._balances(reservation)
        return InventoryMovement.objects.create(
            movement_type=movement_type,
            reservation=reservation,
            order=reservation.order,
            product=reservation.product,
            variant=reservation.variant,
            stock_delta=stock_delta,
            reserved_delta=reserved_delta,
            stock_after=stock_after,
            reserved_after=reserved_after,
            reason=reason,
        )

    @classmethod
    def reserve(cls, order, locked_items, expires_at=None):
        """Reserve already-locked stock rows for an order."""
        expires_at = expires_at or timezone.now() + timedelta(
            minutes=getattr(settings, 'INVENTORY_RESERVATION_MINUTES', 15)
        )
        reservations = []
        for item in locked_items:
            if item.variant:
                item.variant.reserved_stock += item.quantity
                item.variant.save(update_fields=['reserved_stock'])
            else:
                item.inventory.reserved_stock += item.quantity
                item.inventory.save(update_fields=['reserved_stock'])

            reservation = InventoryReservation.objects.create(
                order=order,
                product=item.product,
                variant=item.variant,
                quantity=item.quantity,
                expires_at=expires_at,
            )
            cls._record(
                reservation,
                InventoryMovement.Type.RESERVE,
                stock_delta=0,
                reserved_delta=item.quantity,
                reason='Checkout reservation created',
            )
            reservations.append(reservation)
        return reservations

    @classmethod
    @transaction.atomic
    def commit_order(cls, order):
        reservations = list(
            InventoryReservation.objects.select_for_update(of=('self',))
            .select_related('product', 'variant')
            .filter(order=order, status=InventoryReservation.Status.ACTIVE)
        )
        for reservation in reservations:
            if reservation.variant_id:
                stock_record = ProductVariant.objects.select_for_update().get(id=reservation.variant_id)
            else:
                stock_record = Inventory.objects.select_for_update().get(product_id=reservation.product_id)

            if stock_record.stock_level < reservation.quantity or stock_record.reserved_stock < reservation.quantity:
                raise InsufficientStockException(
                    reservation.product.title,
                    max(stock_record.stock_level - stock_record.reserved_stock, 0),
                    reservation.quantity,
                    reservation.variant.title if reservation.variant_id else None,
                )

            stock_record.stock_level -= reservation.quantity
            stock_record.reserved_stock -= reservation.quantity
            stock_record.save(update_fields=['stock_level', 'reserved_stock'])
            reservation.status = InventoryReservation.Status.COMMITTED
            reservation.committed_at = timezone.now()
            reservation.save(update_fields=['status', 'committed_at', 'updated_at'])
            cls._record(
                reservation,
                InventoryMovement.Type.COMMIT,
                stock_delta=-reservation.quantity,
                reserved_delta=-reservation.quantity,
                reason='Order inventory committed',
            )
        return len(reservations)

    @classmethod
    @transaction.atomic
    def release_order(cls, order, expired=False):
        reservations = list(
            InventoryReservation.objects.select_for_update(of=('self',))
            .select_related('product', 'variant')
            .filter(order=order, status=InventoryReservation.Status.ACTIVE)
        )
        for reservation in reservations:
            if reservation.variant_id:
                stock_record = ProductVariant.objects.select_for_update().get(id=reservation.variant_id)
            else:
                stock_record = Inventory.objects.select_for_update().get(product_id=reservation.product_id)
            stock_record.reserved_stock = max(stock_record.reserved_stock - reservation.quantity, 0)
            stock_record.save(update_fields=['reserved_stock'])
            reservation.status = (
                InventoryReservation.Status.EXPIRED if expired else InventoryReservation.Status.RELEASED
            )
            reservation.released_at = timezone.now()
            reservation.save(update_fields=['status', 'released_at', 'updated_at'])
            cls._record(
                reservation,
                InventoryMovement.Type.EXPIRE if expired else InventoryMovement.Type.RELEASE,
                stock_delta=0,
                reserved_delta=-reservation.quantity,
                reason='Payment window expired' if expired else 'Reservation released',
            )
        return len(reservations)

    @classmethod
    def release_expired(cls, batch_size=200):
        order_ids = list(
            InventoryReservation.objects.filter(
                status=InventoryReservation.Status.ACTIVE,
                expires_at__lte=timezone.now(),
            ).values_list('order_id', flat=True).distinct()[:batch_size]
        )
        released = 0
        from apps.orders.models import Order
        for order in Order.objects.filter(id__in=order_ids):
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=order.pk)
                if order.payment_status != Order.PaymentStatus.PENDING:
                    continue
                order_release_count = cls.release_order(order, expired=True)
                released += order_release_count
                if order_release_count:
                    order.payment_status = Order.PaymentStatus.FAILED
                    order.status = Order.Status.CANCELLED
                    order.save(update_fields=['payment_status', 'status', 'updated_at'])
        return released
