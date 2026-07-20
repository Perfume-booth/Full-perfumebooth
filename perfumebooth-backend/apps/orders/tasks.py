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
        
        if not order.user or not order.user.email:
            return {'status': 'skipped', 'reason': 'user email not found'}
            
        subject = f'Order #{order.order_number} Confirmed — PerfumeBooth'
        message = f'Thank you! Your order #{order.order_number} is confirmed. Total: ₹{order.total}'
        
        items_html = "".join([
            f"<li>{item.product.title} (x{item.quantity}) - ₹{item.price}</li>"
            for item in order.items.all() if item.product
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
            recipient_list=[order.user.email],
            html_message=html_message,
            fail_silently=False
        )

    except Exception as exc:
        raise self.retry(exc=exc)

    return {'status': 'sent', 'order_number': order.order_number}
