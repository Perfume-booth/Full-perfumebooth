"""
Orders Celery Tasks
────────────────────
send_order_email_receipt — Transactional email delivery (emails queue)
"""
from celery import shared_task

from .models import Order


@shared_task(
    bind=True,
    queue='emails',
    max_retries=5,
    default_retry_delay=120,
    name='apps.orders.tasks.send_order_email_receipt',
)
def send_order_email_receipt(self, order_id: str) -> dict:
    """
    Sends a transactional email receipt after a successful payment.

    Plug in your email provider here:
    - Django's send_mail (SMTP)
    - SendGrid / Mailgun API
    - AWS SES

    Args:
        order_id: UUID string of the paid order.

    Returns:
        Dict with status and order number.
    """
    try:
        order = Order.objects.select_related('user').prefetch_related('items').get(
            id=order_id
        )
    except Order.DoesNotExist:
        return {'status': 'skipped', 'reason': 'order not found'}

    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        recipient = order.customer_email or (order.user.email if order.user else '')
        if not recipient:
            return {'status': 'skipped', 'reason': 'user email not found'}
            
        subject = f'Order #{order.order_number} Confirmed — PerfumeBooth'
        message = f'Thank you! Your order #{order.order_number} is confirmed. Total: ₹{order.total}'
        
        items_html = "".join([
            f"<li>{item.product_title or (item.product.title if item.product else 'Product')}"
            f"{f' — {item.variant_title}' if item.variant_title else ''} "
            f"(x{item.quantity}) - ₹{item.unit_price}</li>"
            for item in order.items.all()
        ])
        
        html_message = f"""
            <h2>Thank you for your order!</h2>
            <p>Your order <strong>#{order.order_number}</strong> is confirmed.</p>
            <p><strong>Total Amount Paid:</strong> ₹{order.total}</p>
            <h3>Order Details:</h3>
            <ul>{items_html}</ul>
            <p>If you have any questions, please contact support.</p>
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'PerfumeBooth <onboarding@resend.dev>'),
            recipient_list=[recipient],
            html_message=html_message,
            fail_silently=False
        )

    except Exception as exc:
        raise self.retry(exc=exc)

    return {'status': 'sent', 'order_number': order.order_number}


@shared_task(
    bind=True,
    queue='default',
    max_retries=3,
    default_retry_delay=60,
    name='apps.orders.tasks.push_order_to_shiprocket_task',
)
def push_order_to_shiprocket_task(self, order_id: str) -> dict:
    """
    Pushes a paid order to Shiprocket for fulfillment.
    """
    try:
        order = Order.objects.prefetch_related('items__product').get(id=order_id)
    except Order.DoesNotExist:
        return {'status': 'skipped', 'reason': 'order not found'}

    from .shiprocket import create_shiprocket_order
    if order.shipments.exclude(provider_order_id='').exists():
        return {'success': True, 'status': 'already_created'}
    res = create_shiprocket_order(order)
    return res


@shared_task(name='apps.orders.tasks.process_payment_outbox')
def process_payment_outbox():
    """Durable dispatch. Ambiguous external outcomes need review, not blind retry."""
    from datetime import timedelta
    from django.db import transaction
    from django.utils import timezone
    from .models import PaymentOutbox
    PaymentOutbox.objects.filter(status='processing', updated_at__lt=timezone.now() - timedelta(minutes=10)).update(
        status='review', last_error='Worker interrupted; confirm external delivery before retry')
    for entry_id in list(PaymentOutbox.objects.filter(status='pending').values_list('pk', flat=True)[:100]):
        with transaction.atomic():
            entry = PaymentOutbox.objects.select_for_update().get(pk=entry_id)
            if entry.status != 'pending':
                continue
            if entry.order.payment_status != Order.PaymentStatus.PAID or entry.order.status not in (Order.Status.PAID, Order.Status.PROCESSING):
                entry.status = 'review'
                entry.last_error = 'Order state changed before dispatch; operator review required'
                entry.save(update_fields=['status', 'last_error', 'updated_at'])
                continue
            entry.status = 'processing'
            entry.save(update_fields=['status', 'updated_at'])
        try:
            if entry.kind == 'receipt':
                result = send_order_email_receipt.run(str(entry.order_id))
                success = result.get('status') == 'sent'
            else:
                result = push_order_to_shiprocket_task.run(str(entry.order_id))
                success = result.get('success') is True
            entry.status = 'done' if success else 'review'
            entry.last_error = '' if success else 'Delivery not confirmed; inspect provider before retry'
        except Exception:
            entry.status = 'review'
            entry.last_error = 'Delivery outcome uncertain; inspect provider before retry'
        entry.save(update_fields=['status', 'last_error', 'updated_at'])


@shared_task(name='apps.orders.tasks.reconcile_payments')
def reconcile_payments():
    import logging
    from datetime import timedelta
    from django.utils import timezone
    from .models import PaymentAttempt
    from .payments import reconcile
    attempts = PaymentAttempt.objects.select_related('order').filter(
        status__in=['creating', 'unknown', 'ready'],
        updated_at__lt=timezone.now() - timedelta(minutes=1),
        created_at__gte=timezone.now() - timedelta(days=7),
    ).order_by('updated_at')[:50]
    for attempt in attempts:
        try:
            reconcile(attempt)
        except Exception:
            logging.getLogger(__name__).exception('Payment reconciliation failed for attempt %s', attempt.pk)
        finally:
            PaymentAttempt.objects.filter(pk=attempt.pk).update(updated_at=timezone.now())


@shared_task(
    bind=True,
    queue='emails',
    max_retries=5,
    default_retry_delay=120,
    name='apps.orders.tasks.send_shipping_dispatch_email',
)
def send_shipping_dispatch_email(self, order_id: str) -> dict:
    """
    Sends a transactional dispatch email with AWB & tracking details.
    """
    try:
        order = Order.objects.select_related('user').prefetch_related('shipments').get(id=order_id)
    except Order.DoesNotExist:
        return {'status': 'skipped', 'reason': 'order not found'}

    recipient_email = order.user.email if order.user else (order.shipping_address or {}).get('email')
    if not recipient_email:
        return {'status': 'skipped', 'reason': 'recipient email not found'}

    try:
        from django.core.mail import send_mail
        from django.conf import settings

        subject = f'Your Order #{order.order_number} Has Been Dispatched! — PerfumeBooth'
        shipment = order.shipments.first()
        courier = shipment.courier_name if shipment and shipment.courier_name else 'Shiprocket Courier Partner'
        awb = shipment.awb_code if shipment and shipment.awb_code else 'N/A'
        track_url = shipment.tracking_url if shipment and shipment.tracking_url else f"https://shiprocket.co/tracking/{awb}"

        message = f"Great news! Your order #{order.order_number} has been dispatched via {courier}. AWB: {awb}. Track: {track_url}"
        html_message = f"""
            <h2>Your Order is On Its Way!</h2>
            <p>Order <strong>#{order.order_number}</strong> has been handed over to our courier partner.</p>
            <p><strong>Courier Partner:</strong> {courier}</p>
            <p><strong>AWB Code / Tracking ID:</strong> {awb}</p>
            <p><a href="{track_url}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Shipment Live</a></p>
            <p>Thank you for shopping with PerfumeBooth!</p>
        """

        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'PerfumeBooth <onboarding@resend.dev>'),
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False
        )
    except Exception as exc:
        raise self.retry(exc=exc)

    return {'status': 'sent', 'order_number': order.order_number, 'awb': awb}

