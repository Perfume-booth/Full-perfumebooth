# Newsletter and back-in-stock emails

New newsletter subscriptions require explicit consent and email confirmation.
Existing subscribers are preserved. Restock alerts are separate consent, scoped to
the exact product variant, and never opt the address into marketing.

## Enable delivery

Apply migrations, configure EMAIL_HOST / EMAIL_PORT / EMAIL_HOST_USER /
EMAIL_HOST_PASSWORD in the backend environment, and set:

    CUSTOMER_NOTIFICATIONS_ENABLED=True
    NOTIFICATION_SITE_URL=https://your-storefront-domain
    NOTIFICATION_FROM_EMAIL=PerfumeBooth <admin@perfumebooth.com>

The notification sender defaults to admin@perfumebooth.com as requested. Verify this
sender/domain with your provider. This does not change order-receipt sender settings.

For local testing the URL may be http://localhost:3001. Restart Django, Celery worker
and beat after configuration changes. The worker must consume the `emails` queue;
beat schedules `apps.cms.tasks.deliver_customer_notifications` every minute.
For a manual one-pass local run use `python manage.py process_customer_notifications`.
Do not enable delivery with a local URL for real customer requests.

Without the delivery flag or SMTP credentials, requests stay pending in the database;
they are not falsely marked delivered. Test using Django's in-memory mail backend.

## Operations

Django admin > CMS > Notification subscriptions shows confirmation, delivery status,
timestamps and errors. Newsletter subscribers contains the confirmed marketing list.
Emails include a confirmation or cancellation link. Opening a link makes no change
until the person presses the confirm/unsubscribe button (email-scanner safe).
Confirmation links expire after 30 days. Re-requesting after expiry rotates the token.
Only authenticated users can query their own subscription status.

Restock delivery checks published products, active variants and stock minus reserved
units, including changes made through bulk imports. Each confirmed request receives
one alert. This is not a stock reservation or a guaranteed future price.

SMTP does not provide exactly-once delivery. A timeout is marked `unknown`, and a
worker crash after claiming may leave `sending`. Neither is blindly retried. Inspect
provider logs before manually resetting the appropriate state to `pending`; otherwise
you can send duplicate emails. Pending requests survive worker/broker downtime.

This feature provides newsletter signup/confirmation/unsubscribe, not a bulk campaign
editor or a marketing-provider integration. A future campaign sender must only use
active NewsletterSubscriber rows and include each subscriber's unsubscribe link.
