"""
Orders Services — Webhook & Dispatch Logic
"""
import hashlib
import hmac
from django.conf import settings
from django.db import transaction


COUPONS = {
    'SAVE10': 10,
    'BLOOM15': 15,
    'MEN15': 15,
    'WOMEN15': 15,
}


def calculate_coupon(code, subtotal):
    """Return a deterministic discount calculation owned by the backend."""
    normalized = str(code or '').strip().upper()
    subtotal = max(float(subtotal or 0), 0.0)
    if not normalized:
        return {'valid': True, 'code': '', 'discount_percent': 0, 'discount_amount': 0.0}
    if normalized == 'FREESHIP':
        return {'valid': True, 'code': normalized, 'discount_percent': 0, 'discount_amount': 0.0, 'free_shipping': True}
    percentage = COUPONS.get(normalized)
    if percentage is None:
        return {'valid': False, 'code': normalized, 'discount_percent': 0, 'discount_amount': 0.0, 'message': 'Invalid coupon code.'}
    amount = round(subtotal * percentage / 100, 2)
    return {'valid': True, 'code': normalized, 'discount_percent': percentage, 'discount_amount': amount}
from django.core.cache import cache

from .models import Order


def verify_razorpay_signature(payload_body: bytes, signature: str) -> bool:
    """
    Validates the Razorpay webhook HMAC-SHA256 signature.
    Returns True if the signature is authentic, False otherwise.
    """
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        payload_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@transaction.atomic
def process_payment_webhook(payment_intent_id: str, order_id: str) -> Order:
    """
    Idempotent order payment confirmation.

    Uses a Redis SETNX lock keyed on payment_intent_id to guarantee
    exactly-once processing even if the gateway fires the webhook twice.

    Args:
        payment_intent_id: The payment gateway's unique transaction ID.
        order_id:          The internal Order UUID.

    Returns:
        The updated Order instance.

    Raises:
        ValueError: If the order is not found.
        RuntimeError: If the lock is already held (already processed).
    """
    lock_key = f'payment_webhook_lock:{payment_intent_id}'
    acquired = cache.add(lock_key, '1', timeout=600)  # SETNX with 10-min TTL

    if not acquired:
        raise RuntimeError(f'Webhook for {payment_intent_id} already processed.')

    try:
        order = Order.objects.select_for_update().get(id=order_id)
        from apps.inventory.services import InventoryReservationService
        InventoryReservationService.commit_order(order)
        order.status = Order.Status.PAID
        order.payment_status = Order.PaymentStatus.PAID
        order.payment_intent_id = payment_intent_id
        order.save(update_fields=['status', 'payment_status', 'payment_intent_id', 'updated_at'])

        # Enqueue background Celery tasks
        from .tasks import send_order_email_receipt, push_order_to_shiprocket_task
        send_order_email_receipt.delay(str(order.id))
        push_order_to_shiprocket_task.delay(str(order.id))

    except Order.DoesNotExist:
        cache.delete(lock_key)
        raise ValueError(f'Order {order_id} not found.')
    except Exception:
        cache.delete(lock_key)
        raise

    return order
