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
        # ── Plug in your email sending logic here ──────────────────────────
        # from django.core.mail import send_mail
        # send_mail(
        #     subject=f'Order #{order.order_number} Confirmed — PerfumeBooth',
        #     message=f'Thank you! Your order #{order.order_number} is confirmed.',
        #     from_email='orders@perfumebooth.com',
        #     recipient_list=[order.user.email],
        # )
        # ──────────────────────────────────────────────────────────────────
        pass

    except Exception as exc:
        raise self.retry(exc=exc)

    return {'status': 'sent', 'order_number': order.order_number}
