"""
Orders Services — Webhook & Dispatch Logic
"""
import hashlib
import hmac
from django.conf import settings


COUPONS = {
    'SAVE10': 10,
    'BLOOM15': 15,
    'MEN15': 15,
    'WOMEN15': 15,
}


def calculate_coupon(code, subtotal, user=None):
    """Return a deterministic discount calculation owned by the backend."""
    from django.utils import timezone
    from decimal import Decimal
    from .models import Coupon

    normalized = str(code or '').strip().upper()
    subtotal_dec = Decimal(str(max(float(subtotal or 0), 0.0)))
    if not normalized:
        return {'valid': True, 'code': '', 'discount_percent': 0, 'discount_amount': 0.0}

    # 1. Check database-backed coupon
    coupon = Coupon.objects.filter(code=normalized, is_active=True).first()
    if coupon:
        now = timezone.now()
        if coupon.start_date and now < coupon.start_date:
            return {'valid': False, 'code': normalized, 'discount_amount': 0.0, 'message': 'This coupon promotion has not started yet.'}
        if coupon.end_date and now > coupon.end_date:
            return {'valid': False, 'code': normalized, 'discount_amount': 0.0, 'message': 'This coupon has expired.'}
        if coupon.min_order_value and subtotal_dec < coupon.min_order_value:
            return {'valid': False, 'code': normalized, 'discount_amount': 0.0, 'message': f'Minimum order value of ₹{coupon.min_order_value} required.'}
        if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
            return {'valid': False, 'code': normalized, 'discount_amount': 0.0, 'message': 'Coupon usage limit has been reached.'}
        if coupon.first_order_only and user and user.is_authenticated:
            from .models import Order
            if Order.objects.filter(user=user).exclude(status=Order.Status.CANCELLED).exists():
                return {'valid': False, 'code': normalized, 'discount_amount': 0.0, 'message': 'This coupon is only valid on your first order.'}

        if coupon.discount_type == Coupon.DiscountType.FREE_SHIPPING:
            return {'valid': True, 'code': normalized, 'discount_percent': 0, 'discount_amount': 0.0, 'free_shipping': True}
        elif coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
            calc = (subtotal_dec * coupon.discount_value / Decimal('100')).quantize(Decimal('0.01'))
            if coupon.max_discount:
                calc = min(calc, coupon.max_discount)
            return {'valid': True, 'code': normalized, 'discount_percent': float(coupon.discount_value), 'discount_amount': float(calc)}
        elif coupon.discount_type == Coupon.DiscountType.FIXED:
            amount = min(coupon.discount_value, subtotal_dec)
            return {'valid': True, 'code': normalized, 'discount_percent': 0, 'discount_amount': float(amount)}

    # 2. Fallback to hardcoded coupons
    if normalized == 'FREESHIP':
        return {'valid': True, 'code': normalized, 'discount_percent': 0, 'discount_amount': 0.0, 'free_shipping': True}
    percentage = COUPONS.get(normalized)
    if percentage is None:
        return {'valid': False, 'code': normalized, 'discount_percent': 0, 'discount_amount': 0.0, 'message': 'Invalid coupon code.'}
    amount = round(float(subtotal_dec) * percentage / 100, 2)
    return {'valid': True, 'code': normalized, 'discount_percent': percentage, 'discount_amount': amount}

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
