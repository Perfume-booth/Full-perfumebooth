"""Razorpay boundary and durable payment state machine.

External requests run outside database transactions. Unknown create outcomes
are reconciled by receipt, never retried with another provider order.
"""
import hashlib
import hmac
import json
import re

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.checkout.services.checkout_service import CheckoutService
from apps.inventory.models import InventoryReservation
from apps.inventory.services import InventoryReservationService
from .models import Order, PaymentAttempt, PaymentEvent, PaymentOutbox


def conflict(message):
    error = APIException(message)
    error.status_code = 409
    return error


def gateway(method, path, **kwargs):
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise APIException('Payment gateway is not configured.')
    try:
        response = requests.request(
            method, 'https://api.razorpay.com/v1/' + path,
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            timeout=(5, 20), **kwargs,
        )
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError):
        raise APIException('Payment provider unavailable; retry with the same checkout key.')


def initialize(user, clean_input, key):
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise APIException('Payment gateway is not configured.')
    if clean_input.payment_method != Order.PaymentMethod.RAZORPAY:
        raise ValidationError('Expected Razorpay checkout.')
    result = CheckoutService.idempotent_checkout(user, clean_input, key)
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=result['order_id'])
        if order.payment_status != Order.PaymentStatus.PENDING or order.status != Order.Status.PENDING:
            raise conflict('This checkout is closed. Check your order before starting another purchase.')
        if not order.inventory_reservations.filter(status=InventoryReservation.Status.ACTIVE, expires_at__gt=timezone.now()).exists():
            raise conflict('Payment window expired. Start a new checkout.')
        attempt, _ = PaymentAttempt.objects.get_or_create(order=order)
        if attempt.gateway_order_id:
            return init_result(attempt, order)
        if attempt.status != 'new':
            raise conflict('Payment initialization is being reconciled. Do not start another payment; retry this checkout later.')
        attempt.status = 'creating'
        attempt.save(update_fields=['status', 'updated_at'])
    try:
        provider = gateway('POST', 'orders', json={
            'amount': int(order.total * 100), 'currency': order.currency,
            'receipt': order.order_number, 'notes': {'order_id': str(order.pk)},
        })
        bind_provider(attempt.pk, provider)
    except Exception:
        PaymentAttempt.objects.filter(pk=attempt.pk, status='creating').update(status='unknown', last_error='Provider create outcome requires reconciliation')
        raise
    attempt.refresh_from_db()
    return init_result(attempt, order)


def init_result(attempt, order):
    return {'success': True, 'orderId': attempt.gateway_order_id,
            'internalOrderId': str(order.pk), 'orderName': order.order_number,
            'amount': int(order.total * 100), 'keyId': settings.RAZORPAY_KEY_ID}


@transaction.atomic
def bind_provider(attempt_id, provider):
    attempt = PaymentAttempt.objects.select_for_update().get(pk=attempt_id)
    order = attempt.order
    if (not re.fullmatch(r'order_[A-Za-z0-9]+', str(provider.get('id', '')))
            or provider.get('amount') != int(order.total * 100)
            or provider.get('currency') != order.currency
            or provider.get('receipt') != order.order_number):
        raise ValidationError('Provider order does not match checkout.')
    if attempt.gateway_order_id and attempt.gateway_order_id != provider['id']:
        raise conflict('Provider order already bound.')
    if attempt.gateway_order_id == provider['id']:
        return
    attempt.gateway_order_id = provider['id']
    attempt.status = 'ready'
    attempt.last_error = ''
    attempt.save()


@transaction.atomic
def process_entity(entity, event_id, event_type):
    required = ('id', 'order_id', 'amount', 'currency', 'status')
    if not isinstance(entity, dict) or any(key not in entity for key in required):
        raise ValidationError('Malformed payment entity.')
    if not re.fullmatch(r'pay_[A-Za-z0-9_]+', str(entity['id'])):
        raise ValidationError('Invalid payment identifier.')
    if (not isinstance(entity['order_id'], str) or not re.fullmatch(r'order_[A-Za-z0-9]+', entity['order_id'])
            or len(str(entity['id'])) > 100 or len(entity['order_id']) > 100):
        raise ValidationError('Invalid gateway order identifier.')
    try:
        attempt = PaymentAttempt.objects.get(gateway_order_id=entity['order_id'])
    except PaymentAttempt.DoesNotExist:
        raise conflict('Unbound provider order; reconciliation required.')
    order = Order.objects.select_for_update().get(pk=attempt.order_id)
    attempt = PaymentAttempt.objects.select_for_update().get(pk=attempt.pk)
    fingerprint = hashlib.sha256(json.dumps({'entity': {key: entity[key] for key in required}, 'type': event_type}, sort_keys=True).encode()).hexdigest()
    existing = PaymentEvent.objects.filter(event_id=event_id).first()
    if existing:
        if existing.fingerprint != fingerprint:
            raise conflict('Event identifier reused with a different payload.')
        return order, existing.outcome
    if (type(entity['amount']) is not int or entity['amount'] != int(order.total * 100)
            or entity['currency'] != order.currency or order.payment_method != Order.PaymentMethod.RAZORPAY):
        raise ValidationError('Payment amount, currency or method does not match order.')
    expected_status = {'payment.captured': 'captured', 'payment.failed': 'failed', 'payment.authorized': 'authorized'}
    if entity['status'] != expected_status.get(event_type):
        raise ValidationError('Payment event and status disagree.')
    outcome = 'ignored'
    if event_type == 'payment.captured':
        if order.payment_intent_id == entity['id']:
            outcome = 'duplicate'
        elif (order.payment_status != Order.PaymentStatus.PENDING
              or order.status != Order.Status.PENDING
              or not order.inventory_reservations.filter(status=InventoryReservation.Status.ACTIVE).exists()
              or order.inventory_reservations.exclude(status=InventoryReservation.Status.ACTIVE).exists()
              or order.inventory_reservations.filter(expires_at__lte=timezone.now()).exists()):
            attempt.status = 'review'
            attempt.last_error = 'Capture on closed/expired/already paid order: ' + entity['id']
            outcome = 'review'
        else:
            InventoryReservationService.commit_order(order)
            order.payment_status = Order.PaymentStatus.PAID
            order.status = Order.Status.PAID
            order.payment_intent_id = entity['id']
            order.save(update_fields=['payment_status', 'status', 'payment_intent_id', 'updated_at'])
            attempt.status = 'paid'
            for kind in ('receipt', 'fulfillment'):
                PaymentOutbox.objects.get_or_create(order=order, kind=kind)
            outcome = 'paid'
    elif event_type == 'payment.failed':
        # A failed attempt is not a failed order: Checkout permits another attempt.
        outcome = 'attempt_failed' if order.payment_status == Order.PaymentStatus.PENDING else 'ignored'
    else:
        outcome = 'awaiting_capture'
    attempt.save(update_fields=['status', 'last_error', 'updated_at'])
    PaymentEvent.objects.create(event_id=event_id, fingerprint=fingerprint, payment_id=entity['id'], order=order, outcome=outcome)
    return order, outcome


def verify(data):
    if not isinstance(data, dict):
        raise ValidationError('Expected an object.')
    provider_id, payment_id, signature = (data.get(k, '') for k in ('razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'))
    if (not isinstance(provider_id, str) or not re.fullmatch(r'order_[A-Za-z0-9]+', provider_id)
            or not isinstance(payment_id, str) or not re.fullmatch(r'pay_[A-Za-z0-9]+', payment_id)
            or not isinstance(signature, str) or not re.fullmatch(r'[a-f0-9]{64}', signature)):
        raise ValidationError('Invalid payment verification parameters.')
    attempt = PaymentAttempt.objects.filter(gateway_order_id=provider_id).first()
    if not attempt or not settings.RAZORPAY_KEY_SECRET:
        raise ValidationError('Unknown payment order or unconfigured gateway.')
    expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), f'{attempt.gateway_order_id}|{payment_id}'.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise ValidationError('Invalid payment signature.')
    entity = gateway('GET', 'payments/' + payment_id)
    if entity.get('id') != payment_id or entity.get('order_id') != attempt.gateway_order_id:
        raise ValidationError('Payment belongs to a different order.')
    event_type = 'payment.' + str(entity.get('status'))
    order, outcome = process_entity(entity, f'verify:{payment_id}:{entity.get("status")}', event_type)
    if outcome == 'review':
        raise conflict('Payment received but order requires review. Do not pay again; contact support.')
    return {'success': order.payment_status == Order.PaymentStatus.PAID,
            'pending': order.payment_status != Order.PaymentStatus.PAID,
            'message': 'Payment is awaiting capture; do not pay again.' if order.payment_status != Order.PaymentStatus.PAID else '',
            'orderId': str(order.pk), 'orderName': order.order_number, 'total': str(order.total)}


def reconcile(attempt):
    if not attempt.gateway_order_id:
        # Restrict the provider lookup to the original receipt, never create again.
        matches = gateway('GET', 'orders', params={'receipt': attempt.order.order_number, 'count': 100}).get('items', [])
        matches = [item for item in matches if item.get('receipt') == attempt.order.order_number]
        if len(matches) != 1:
            PaymentAttempt.objects.filter(pk=attempt.pk).update(last_error='No unique provider order found; operator review required')
            return
        bind_provider(attempt.pk, matches[0])
        attempt.refresh_from_db()
    for entity in gateway('GET', f'orders/{attempt.gateway_order_id}/payments').get('items', []):
        if entity.get('status') in ('captured', 'failed', 'authorized'):
            process_entity(entity, f'reconcile:{entity["id"]}:{entity["status"]}', 'payment.' + entity['status'])
