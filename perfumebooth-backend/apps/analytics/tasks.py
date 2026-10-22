from datetime import timedelta
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from .models import Event, OrderAttribution


@shared_task
def process_pending_events():
    # Durable inbox survives a broker outage. Marking is idempotent and bounded;
    # source events remain immutable, and reports read processed rows only.
    ids = list(Event.objects.filter(processed_at__isnull=True).order_by('received_at').values_list('id', flat=True)[:2000])
    return Event.objects.filter(id__in=ids, processed_at__isnull=True).update(processed_at=timezone.now())


@shared_task
def expire_analytics():
    if not 1 <= settings.ANALYTICS_RETENTION_DAYS <= 365:
        raise ValueError('Analytics retention must be between 1 and 365 days; no deletion performed.')
    cutoff = timezone.now()-timedelta(days=settings.ANALYTICS_RETENTION_DAYS)
    # Only analytics data, never orders or financial records.
    Event.objects.filter(received_at__lt=cutoff).delete()
    OrderAttribution.objects.filter(created_at__lt=cutoff).delete()


@shared_task
def refresh_provider_reports():
    from .providers import REQUIRED, missing, sync_day
    # Re-fetch recent finalized dates; late provider adjustments replace snapshots,
    # never add the same spend twice. Historical backfill is a separate operation.
    for provider in REQUIRED:
        if missing(provider):
            continue
        for age in range(1, 5):
            sync_day(provider, timezone.localdate()-timedelta(days=age))
