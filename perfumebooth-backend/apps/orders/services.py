"""
Orders Services — Webhook & Dispatch Logic
"""
import hashlib
import hmac
from django.conf import settings


def calculate_coupon(code, subtotal, user=None, customer_email=None):
    """Return a deterministic discount calculation owned by the backend."""
    from decimal import Decimal
    from apps.checkout.services.pricing_service import PricingService
    from apps.checkout.exceptions import InvalidCouponException

    normalized = str(code or '').strip().upper()
    if not normalized:
        return {'valid': True, 'code': '', 'discount_percent': 0, 'discount_amount': 0.0, 'free_shipping': False}

    subtotal_dec = Decimal(str(max(float(subtotal or 0), 0.0)))
    try:
        res = PricingService.validate_and_calculate_coupon(
            coupon_code=normalized,
            subtotal=subtotal_dec,
            user=user,
            customer_email=customer_email
        )
        coupon = res.get('coupon')
        pct = float(coupon.discount_value) if (coupon and coupon.discount_type == 'percentage') else 0.0
        return {
            'valid': True,
            'code': res['code'],
            'discount_amount': float(res['discount_amount']),
            'discount_percent': pct,
            'free_shipping': res.get('free_shipping', False),
            'message': 'Coupon applied successfully'
        }
    except InvalidCouponException as e:
        return {
            'valid': False,
            'code': normalized,
            'discount_percent': 0,
            'discount_amount': 0.0,
            'free_shipping': False,
            'message': str(e.message or 'Invalid coupon code.')
        }

from .models import Order


def verify_razorpay_signature(payload_body: bytes, signature: str) -> bool:
    """
    Validates the Razorpay webhook HMAC-SHA256 signature.
    Returns True if the signature is authentic, False otherwise.
    """
    if not settings.RAZORPAY_WEBHOOK_SECRET or not signature:
        return False
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        payload_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def process_payment_webhook(payment_intent_id: str, order_id: str) -> Order:
    """Compatibility entry point using provider verification and durable state."""
    # Legacy callers must also verify the provider entity and its saved binding.
    from .payments import gateway, process_entity
    import re
    if not re.fullmatch(r'pay_[A-Za-z0-9]+', payment_intent_id):
        raise ValueError('Invalid payment identifier.')
    entity = gateway('GET', 'payments/' + payment_intent_id)
    from .models import PaymentAttempt
    if entity.get('id') != payment_intent_id or not PaymentAttempt.objects.filter(order_id=order_id, gateway_order_id=entity.get('order_id')).exists():
        raise ValueError('Payment is not bound to this order.')
    order, _ = process_entity(entity, f'legacy:{payment_intent_id}', 'payment.captured')
    return order
