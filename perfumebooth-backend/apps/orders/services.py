"""
Orders Services — Webhook & Dispatch Logic
"""
import hashlib
import hmac
from django.conf import settings
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
        order = Order.objects.get(id=order_id)
        order.status = Order.Status.PAID
        order.payment_intent_id = payment_intent_id
        order.save(update_fields=['status', 'payment_intent_id', 'updated_at'])

        # Enqueue background Celery tasks
        from .tasks import send_order_email_receipt, push_order_to_shiprocket_task
        send_order_email_receipt.delay(str(order.id))
        push_order_to_shiprocket_task.delay(str(order.id))

    except Order.DoesNotExist:
        cache.delete(lock_key)
        raise ValueError(f'Order {order_id} not found.')

    return order
