"""Durable scheduling and compare-and-swap undo for update-only imports."""
from copy import deepcopy

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import ProductImportJob


def validate_mapping(columns):
    from .product_imports import HEADER_MAP
    if not isinstance(columns, dict) or len(columns) > 100:
        raise ValueError('Mapping must be an object of at most 100 source headers to fields.')
    result = {}
    for source, field in columns.items():
        if not isinstance(source, str) or not source.strip() or len(source) > 200 or not isinstance(field, str) or field not in set(HEADER_MAP.values()):
            raise ValueError('Invalid source header or destination field in mapping.')
        if field in result.values():
            raise ValueError('Two source columns cannot map to the same field.')
        if source.strip() in result:
            raise ValueError('Source headers must be unique after trimming.')
        result[source.strip()] = field
    return result


def build_snapshot(job):
    if job.creates or job.image_operations or any(op['action'] != 'UPDATE' for op in job.variant_operations):
        return {}
    return deepcopy({'version': 1, 'changes': job.changes, 'variants': job.variant_operations, 'bulk': job.bulk_operations})


def require_owner(job, user):
    if not user or (job.created_by_id != user.pk and not user.is_superuser):
        raise PermissionError('You can only manage your own import jobs.')


@transaction.atomic
def undo_import(job_id, user):
    from .product_imports import _apply_preview_records
    job = ProductImportJob.objects.select_for_update().get(pk=job_id)
    require_owner(job, user)
    if job.undone_at:
        return job
    if job.status != 'applied' or not job.snapshot:
        raise ValueError('Undo is available only for applied update-only imports without creates, deletes or image operations.')
    snapshot = deepcopy(job.snapshot)
    for change in snapshot['changes'] + snapshot['bulk']:
        change['old_value'], change['new_value'] = change['new_value'], change['old_value']
    for operation in snapshot['variants']:
        operation['changes'], operation['old_values'] = operation['old_values'], operation['changes']
    reverse = ProductImportJob.objects.create(
        created_by=user, filename=f'Undo {job.id}', file_sha256='', status='preview_ready',
        changes=snapshot['changes'], variant_operations=snapshot['variants'], bulk_operations=snapshot['bulk'],
    )
    # Same transactional stale-value / reservation checks as the original apply.
    _apply_preview_records(reverse.pk, user, {}, 0)
    reverse.snapshot = {}  # No undo-of-undo chains; preserve the reverse job for audit.
    reverse.save(update_fields=['snapshot'])
    job.undone_at = timezone.now()
    if job.schedule_state == 'active':
        job.schedule_state = 'ended'
    job.save(update_fields=['undone_at', 'schedule_state'])
    transaction.on_commit(cache.clear)
    return job


def _date(value):
    try:
        parsed = parse_datetime(value) if isinstance(value, str) else None
    except ValueError:
        parsed = None
    if not parsed or timezone.is_naive(parsed):
        raise ValueError('Use an ISO date/time including timezone, for example 2026-12-01T09:00:00+05:30.')
    return parsed


@transaction.atomic
def schedule_import(job_id, user, starts_at, ends_at=None):
    job = ProductImportJob.objects.select_for_update().get(pk=job_id)
    require_owner(job, user)
    if job.status != 'preview_ready' or job.errors or job.schedule_state:
        raise ValueError('Only a valid, unscheduled preview can be scheduled.')
    # No image network I/O or destructive operations in scheduled transactions.
    fields = [c['field'] for c in job.changes] + [c['field'] for c in job.bulk_operations]
    fields += [f for op in job.variant_operations for f in op.get('changes', {})]
    if job.creates or job.image_operations or any(op['action'] != 'UPDATE' for op in job.variant_operations) or not fields or any(f not in {'price', 'compare_at_price'} for f in fields):
        raise ValueError('Scheduled imports must contain only price/compare-at-price updates. Use a separate workbook for other actions.')
    start, end = _date(starts_at), _date(ends_at) if ends_at else None
    if start <= timezone.now() or (end and end <= start):
        raise ValueError('Start must be in the future; sale end must be after start.')
    job.scheduled_at, job.sale_ends_at, job.schedule_state = start, end, 'pending'
    job.save(update_fields=['scheduled_at', 'sale_ends_at', 'schedule_state'])
    return job


@transaction.atomic
def cancel_schedule(job_id, user):
    job = ProductImportJob.objects.select_for_update().get(pk=job_id)
    require_owner(job, user)
    if job.schedule_state != 'pending':
        raise ValueError('Only pending schedules can be cancelled. Use undo for an active sale.')
    job.schedule_state = 'cancelled'
    job.save(update_fields=['schedule_state'])
    return job


def run_due_imports(now=None):
    """DB state is the delivery ledger: duplicate ticks cannot repeat an adjustment."""
    from .product_imports import _apply_preview_records
    now = now or timezone.now()
    ids = list(ProductImportJob.objects.filter(schedule_state='pending', scheduled_at__lte=now).order_by('scheduled_at').values_list('pk', flat=True)[:50])
    ids += list(ProductImportJob.objects.filter(schedule_state='active', sale_ends_at__lte=now).order_by('sale_ends_at').values_list('pk', flat=True)[:50])
    for job_id in ids:
        with transaction.atomic():
            job = ProductImportJob.objects.select_for_update().get(pk=job_id)
            if job.schedule_state not in {'pending', 'active'}:
                continue
            try:
                with transaction.atomic():
                    if job.schedule_state == 'active':
                        undo_import(job_id, job.created_by)
                    elif job.sale_ends_at and job.sale_ends_at <= now:
                        job.schedule_state = 'expired'
                        job.save(update_fields=['schedule_state'])
                    else:
                        if not job.created_by or not job.created_by.is_active:
                            raise ValueError('Schedule owner is no longer active.')
                        if not job.created_by.roles.filter(role__name__in=['Super Admin', 'Admin', 'E-commerce Executive']).exists():
                            raise ValueError('Schedule owner no longer has catalog import permission.')
                        _apply_preview_records(job_id, job.created_by, {}, 0, scheduled=True)
                        job.schedule_state = 'active' if job.sale_ends_at else 'completed'
                        job.save(update_fields=['schedule_state'])
                    transaction.on_commit(cache.clear)
            except (ValueError, PermissionError) as exc:
                job.schedule_state = 'review'
                job.error_message = str(exc)[:2000]
                job.save(update_fields=['schedule_state', 'error_message'])
    return {'checked': len(ids)}
