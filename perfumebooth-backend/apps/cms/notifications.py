"""Durable opt-in and stock alerts. Never subscribe restock requests to marketing."""
import uuid
from datetime import timedelta
from urllib.parse import urlencode, quote

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.shop.models import Product, ProductVariant, Inventory
from .models import NewsletterSubscriber, NotificationSubscription


class SubscriptionInput(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    consent = serializers.BooleanField()
    product_id = serializers.UUIDField(required=False)
    variant_id = serializers.UUIDField(required=False, allow_null=True)
    source = serializers.CharField(max_length=100, required=False, default='website_footer')

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError('Please agree to receive these emails.')
        return value


def available(product, variant=None):
    if not product or not product.is_online:
        return False
    if variant:
        return variant.is_active and variant.available_stock > 0
    if product.variants.exists():
        return any(v.available_stock > 0 for v in product.variants.filter(is_active=True))
    stock = Inventory.objects.filter(product=product).first()
    return bool(stock and stock.available_stock > 0)


@transaction.atomic
def subscribe(data, kind):
    email = data['email'].strip().lower()
    product = variant = None
    target = 'newsletter'
    if kind == 'restock':
        product = Product.objects.filter(pk=data.get('product_id'), is_online=True).first()
        if not product:
            raise serializers.ValidationError('This product is not available for stock alerts.')
        if data.get('variant_id'):
            variant = ProductVariant.objects.filter(pk=data['variant_id'], product=product, is_active=True).first()
            if not variant:
                raise serializers.ValidationError('Choose a valid product variant.')
        elif product.variants.filter(is_active=True).exists():
            raise serializers.ValidationError('Choose the variant you want to be notified about.')
        if available(product, variant):
            raise serializers.ValidationError('This item is already in stock. Refresh the product page.')
        target = str(variant.pk if variant else product.pk)
    else:
        # Preserve legacy active subscribers; new consent is verified before activation.
        subscriber, _ = NewsletterSubscriber.objects.get_or_create(
            email=email, defaults={'is_active': False, 'source': data['source']})
        if subscriber.is_active:
            return

    sub, created = NotificationSubscription.objects.select_for_update().get_or_create(
        email=email, kind=kind, target=target, defaults={'product': product, 'variant': variant})
    if not created and (not sub.is_active or sub.notification_state == 'sent' or
                        (not sub.confirmed_at and sub.requested_at < timezone.now() - timedelta(days=30))):
        # A deliberate new request starts a new consent cycle. Old links stop working.
        if sub.requested_at > timezone.now() - timedelta(hours=1):
            raise serializers.ValidationError('Please wait before requesting another notification.')
        sub.token = uuid.uuid4()
        sub.is_active = True
        sub.confirmed_at = sub.notified_at = None
        sub.confirmation_state = sub.notification_state = 'pending'
        sub.requested_at = timezone.now()
        sub.last_error = ''
        sub.save()


@transaction.atomic
def manage(token, action):
    sub = NotificationSubscription.objects.select_for_update().filter(token=token).first()
    if not sub:
        raise serializers.ValidationError('This link is invalid or has been replaced.')
    if action == 'unsubscribe':
        sub.is_active = False
        sub.save(update_fields=['is_active'])
        if sub.kind == 'newsletter':
            NewsletterSubscriber.objects.filter(email=sub.email).update(is_active=False)
        return 'You have been unsubscribed.'
    if not sub.is_active:
        raise serializers.ValidationError('This request was cancelled. Please subscribe again on the website.')
    if not sub.confirmed_at and sub.requested_at < timezone.now() - timedelta(days=30):
        raise serializers.ValidationError('This confirmation link has expired.')
    if not sub.confirmed_at:
        sub.confirmed_at = timezone.now()
        sub.save(update_fields=['confirmed_at'])
    if sub.kind == 'newsletter':
        NewsletterSubscriber.objects.filter(email=sub.email).update(is_active=True)
        return 'Your newsletter subscription is confirmed.'
    return 'Your stock alert is confirmed. We will email you when this item is available.'


def management_url(sub, action):
    return settings.NOTIFICATION_SITE_URL.rstrip('/') + '/notifications?' + urlencode({'token': sub.token, 'action': action})


def process_notifications(limit=100):
    """Periodic scan also catches bulk inventory updates that bypass model signals.

    Claim before SMTP; ambiguous failures are NOT retried automatically (SMTP has no
    idempotency key). Staff must inspect the provider log before resetting a claim.
    """
    if not settings.CUSTOMER_NOTIFICATIONS_ENABLED:
        return 0
    if settings.EMAIL_BACKEND.endswith('smtp.EmailBackend') and not settings.EMAIL_HOST_PASSWORD:
        return 0
    sent = 0
    pending = NotificationSubscription.objects.filter(is_active=True, confirmation_state='pending', confirmed_at__isnull=True,
                                                      requested_at__gte=timezone.now() - timedelta(days=30))
    restocks = NotificationSubscription.objects.filter(is_active=True, kind='restock', confirmed_at__isnull=False, notification_state='pending')
    from django.db.models import F, Q
    restocks = restocks.filter(product__is_online=True).filter(
        Q(variant__is_active=True, variant__stock_level__gt=F('variant__reserved_stock')) |
        Q(variant__isnull=True, product__inventory__stock_level__gt=F('product__inventory__reserved_stock')))
    for is_confirmation, qs in [(True, pending), (False, restocks)]:
        for sub in qs.select_related('product', 'variant').order_by('requested_at')[:limit]:
            field = 'confirmation_state' if is_confirmation else 'notification_state'
            with transaction.atomic():
                current = NotificationSubscription.objects.select_for_update().get(pk=sub.pk)
                if not current.is_active or current.token != sub.token or getattr(current, field) != 'pending':
                    continue
                if not is_confirmation and not available(sub.product, sub.variant):
                    continue
                setattr(current, field, 'sending')
                current.save(update_fields=[field])
            cancel = management_url(sub, 'unsubscribe')
            if is_confirmation:
                subject = 'Confirm your PerfumeBooth ' + ('newsletter subscription' if sub.kind == 'newsletter' else 'stock alert')
                body = f'Please confirm your email request:\n{management_url(sub, "confirm")}\n\nIf you did not request this, ignore this email or cancel:\n{cancel}'
            else:
                label = sub.product.title + (f' — {sub.variant.title}' if sub.variant else '')
                subject = 'Your PerfumeBooth item is back in stock'
                body = f'{label} is available again. Stock is not reserved and may sell out.\n\n{settings.NOTIFICATION_SITE_URL.rstrip("/")}/products/{quote(sub.product.slug)}\n\nCancel this alert:\n{cancel}'
            try:
                if send_mail(subject, body, settings.NOTIFICATION_FROM_EMAIL, [sub.email], fail_silently=False) != 1:
                    raise RuntimeError('Email provider did not accept the message')
            except Exception as exc:
                NotificationSubscription.objects.filter(pk=sub.pk, token=sub.token).update(
                    **{field: 'unknown', 'last_error': type(exc).__name__})
                continue
            changes = {field: 'sent', 'last_error': ''}
            if not is_confirmation:
                changes['notified_at'] = timezone.now()
            NotificationSubscription.objects.filter(pk=sub.pk, token=sub.token).update(**changes)
            sent += 1
    return sent
