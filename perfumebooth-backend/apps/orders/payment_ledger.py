"""Ingestion only from signature-verified webhooks or authenticated gateway reads."""
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
import re

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Order, PaymentTransaction


def record_capture(order, entity):
    # The caller has validated amount/currency/order binding and holds the order lock.
    return _record(order, entity['id'], entity['id'], 'capture', entity['amount'],
                   entity['currency'], entity.get('method', ''), None)


def _record(order, reference, payment_id, kind, amount, currency, method, event_time):
    if type(amount) is not int or amount <= 0:
        raise ValidationError('Movement amount must be a positive integer in minor units.')
    when = timezone.now()
    basis = 'received_at'
    if event_time is not None:
        if type(event_time) is not int or event_time <= 0:
            raise ValidationError('Invalid event timestamp.')
        try:
            when = datetime.fromtimestamp(event_time, dt_timezone.utc)
        except (ValueError, OverflowError, OSError):
            raise ValidationError('Invalid event timestamp.')
        if when > timezone.now():
            raise ValidationError('Event timestamp cannot be in the future.')
        basis = 'provider_event'
    entry, created = PaymentTransaction.objects.get_or_create(
        gateway='razorpay', reference=reference, kind=kind,
        defaults={'order': order, 'payment_id': payment_id, 'amount': Decimal(amount)/100,
                  'currency': currency, 'method': str(method)[:30], 'occurred_at': when, 'time_basis': basis},
    )
    if (entry.order_id != order.pk or entry.payment_id != payment_id or
            entry.amount != Decimal(amount)/100 or entry.currency != currency):
        raise ValidationError('Provider reference conflicts with an existing money movement.')
    return entry, created


@transaction.atomic
def record_refund(entity, event_time=None):
    """Record each processed refund separately; never infer a physical return."""
    if not isinstance(entity, dict) or entity.get('status') != 'processed':
        raise ValidationError('Expected a processed refund entity.')
    for key, prefix in [('id', 'rfnd_'), ('payment_id', 'pay_')]:
        value = entity.get(key)
        if not isinstance(value, str) or len(value) > 100 or not re.fullmatch(prefix + r'[A-Za-z0-9_]+', value):
            raise ValidationError('Invalid refund or payment reference.')
    # Captures under operator review can also be refunded. Do not associate by
    # customer-supplied order metadata or fabricate missing captures.
    capture = PaymentTransaction.objects.filter(gateway='razorpay', kind='capture', reference=entity['payment_id']).first()
    if not capture:
        raise ValidationError('Capture missing; reconcile the payment and replay this refund.')
    order = Order.objects.select_for_update().get(pk=capture.order_id)
    if entity.get('currency') != capture.currency:
        raise ValidationError('Refund currency does not match capture.')
    entry, created = _record(order, entity['id'], capture.payment_id, 'refund', entity.get('amount'),
                             capture.currency, capture.method, event_time)
    total = PaymentTransaction.objects.filter(gateway='razorpay', kind='refund', payment_id=capture.payment_id).aggregate(total=Sum('amount'))['total']
    if total > capture.amount:
        raise ValidationError('Cumulative refunds exceed the captured payment.')
    if created and order.payment_intent_id == capture.payment_id:
        order.payment_status = Order.PaymentStatus.REFUNDED if total == capture.amount else Order.PaymentStatus.PARTIALLY_REFUNDED
        order.save(update_fields=['payment_status', 'updated_at'])
    return entry, created
