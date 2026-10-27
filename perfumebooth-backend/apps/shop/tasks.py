"""
Shop Celery Tasks
──────────────────
process_bulk_csv_import      — Bulk catalog CSV processing (imports queue)
generate_product_embeddings  — pgvector embedding generation (ai_tasks queue)
"""
import csv
import requests
from celery import shared_task
from django.db import transaction
from django.core.cache import cache
from django.utils import timezone

from .models import Product, Inventory, ProductImportJob
from .product_imports import apply_preview, create_preview


@shared_task(queue='imports', name='apps.shop.tasks.run_scheduled_imports')
def run_scheduled_imports():
    from .advanced_imports import run_due_imports
    return run_due_imports()


@shared_task(bind=True, queue='imports', name='apps.shop.tasks.process_catalog_preview_job')
def process_catalog_preview_job(self, job_id: str) -> dict:
    """Build a durable catalog preview outside the HTTP request lifecycle."""
    job = None
    try:
        with transaction.atomic():
            job = ProductImportJob.objects.select_for_update().get(pk=job_id)
            if job.status in {ProductImportJob.Status.PREVIEW_READY, ProductImportJob.Status.INVALID}:
                return {'status': job.status, 'job_id': job_id}
            if job.status not in {ProductImportJob.Status.QUEUED, ProductImportJob.Status.PROCESSING}:
                return {'status': 'skipped', 'job_id': job_id}
            job.status = ProductImportJob.Status.PROCESSING
            job.started_at = job.started_at or timezone.now()
            job.task_id = self.request.id or job.task_id
            job.progress_current = 0
            job.progress_total = 1
            job.error_message = ''
            job.save(update_fields=['status', 'started_at', 'task_id', 'progress_current', 'progress_total', 'error_message'])
        job.source_file.open('rb')
        job.source_file.file.name = job.filename
        def report_progress(current, total):
            ProductImportJob.objects.filter(pk=job_id).update(progress_current=current, progress_total=total)
            self.update_state(state='PROGRESS', meta={'current': current, 'total': total})
        create_preview(
            job.source_file.file, job.created_by, mode=job.mode,
            draft_default=bool(job.summary.get('draft_default', True)), job=job,
            progress_callback=report_progress,
        )
        return {'status': job.status, 'job_id': job_id}
    except Exception as exc:
        ProductImportJob.objects.filter(pk=job_id).update(
            status=ProductImportJob.Status.FAILED, error_message=str(exc)[:2000],
            finished_at=timezone.now(), progress_current=0, progress_total=1,
        )
        raise
    finally:
        if job and job.source_file:
            job.source_file.close()


@shared_task(bind=True, queue='imports', name='apps.shop.tasks.apply_catalog_import_job')
def apply_catalog_import_job(self, job_id: str) -> dict:
    """Apply an approved preview once; database writes remain transactional."""
    try:
        with transaction.atomic():
            job = ProductImportJob.objects.select_for_update().get(pk=job_id)
            if job.status == ProductImportJob.Status.APPLIED:
                return {'status': job.status, 'job_id': job_id}
            if job.status not in {ProductImportJob.Status.APPLY_QUEUED, ProductImportJob.Status.APPLYING}:
                return {'status': 'skipped', 'job_id': job_id}
            job.status = ProductImportJob.Status.APPLYING
            job.started_at = timezone.now()
            job.task_id = self.request.id or job.task_id
            job.progress_current = 0
            job.progress_total = 1
            job.error_message = ''
            job.save(update_fields=['status', 'started_at', 'task_id', 'progress_current', 'progress_total', 'error_message'])
        def report_progress(current, total):
            ProductImportJob.objects.filter(pk=job_id).update(progress_current=current, progress_total=total)
            self.update_state(state='PROGRESS', meta={'current': current, 'total': total})
        job = apply_preview(job_id, job.created_by, progress_callback=report_progress)
        cache.clear()
        return {'status': job.status, 'job_id': job_id}
    except Exception as exc:
        ProductImportJob.objects.filter(pk=job_id).update(
            status=ProductImportJob.Status.FAILED, error_message=str(exc)[:2000],
            finished_at=timezone.now(), progress_current=0, progress_total=1,
        )
        raise


@shared_task(
    bind=True,
    queue='imports',
    max_retries=3,
    default_retry_delay=60,
    name='apps.shop.tasks.process_bulk_csv_import',
)
def process_bulk_csv_import(self, file_url: str) -> dict:
    """
    Downloads and processes a product/inventory CSV from S3.

    Progress is published to Celery state (poll via task ID).

    CSV expected columns:
        slug, title, description, price, is_online, stock_level

    Args:
        file_url: Presigned S3 URL to the CSV file.

    Returns:
        Dict with status and total processed count.
    """
    try:
        response = requests.get(file_url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise self.retry(exc=exc)

    csv_data = response.text.splitlines()
    reader = csv.DictReader(csv_data)
    rows = list(reader)
    total_records = len(rows)
    processed = 0
    batch_size = 500

    for i in range(0, total_records, batch_size):
        batch = rows[i:i + batch_size]
        
        # 1. Bulk upsert Products
        products_to_upsert = []
        for row in batch:
            products_to_upsert.append(Product(
                slug=row['slug'],
                title=row['title'],
                description=row.get('description', ''),
                price=float(row['price']),
                sku=row.get('sku', row['slug']),
                is_online=row.get('is_online', 'true').lower() == 'true',
            ))
            
        with transaction.atomic():
            Product.objects.bulk_create(
                products_to_upsert,
                update_conflicts=True,
                unique_fields=['slug'],
                update_fields=['title', 'description', 'price', 'sku', 'is_online']
            )
            
            # Fetch the upserted products to map slugs to product IDs
            slugs = [row['slug'] for row in batch]
            db_products = {p.slug: p for p in Product.objects.filter(slug__in=slugs)}
            
            # 2. Bulk upsert Inventory
            inventories_to_upsert = []
            for row in batch:
                product = db_products.get(row['slug'])
                if product:
                    inventories_to_upsert.append(Inventory(
                        product=product,
                        stock_level=int(row.get('stock_level', 0))
                    ))
            
            Inventory.objects.bulk_create(
                inventories_to_upsert,
                update_conflicts=True,
                unique_fields=['product'],
                update_fields=['stock_level']
            )

        processed += len(batch)
        self.update_state(
            state='PROGRESS',
            meta={'current': processed, 'total': total_records},
        )

    return {'status': 'Completed', 'processed_count': processed}


@shared_task(
    bind=True,
    queue='ai_tasks',
    max_retries=3,
    default_retry_delay=30,
    name='apps.shop.tasks.generate_product_embeddings',
)
def generate_product_embeddings(self, product_id: str) -> dict:
    """
    Generates and persists a semantic text embedding for a product.

    Triggered by the post_save signal on Product model changes.
    Replace `_generate_embedding` with your actual embedding API call
    (e.g., sentence-transformers, OpenAI ada-002, Google Vertex AI).

    Args:
        product_id: UUID string of the product to embed.

    Returns:
        Dict confirming product ID and embedding dimensions.
    """
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return {'status': 'skipped', 'reason': 'product not found'}

    # Compose the text to embed
    embed_text = f'{product.title}. {product.description}'

    # ── Plug in your embedding model here ─────────────────────────────────────
    # Example: from sentence_transformers import SentenceTransformer
    # model = SentenceTransformer('all-MiniLM-L6-v2')
    # embedding = model.encode(embed_text).tolist()
    # ──────────────────────────────────────────────────────────────────────────
    embedding = _placeholder_embedding(embed_text)

    product.embedding = embedding
    product.save(update_fields=['embedding'])

    return {'status': 'ok', 'product_id': product_id, 'dims': len(embedding)}


def _placeholder_embedding(text: str) -> list[float]:
    """
    Returns a zero-vector placeholder (384 dims).
    Replace with a real embedding API call before going to production.
    """
    return [0.0] * 384


@shared_task(
    bind=True,
    queue='default',
    name='apps.shop.tasks.check_and_send_low_stock_alerts',
)
def check_and_send_low_stock_alerts(self, threshold: int = 5) -> dict:
    """
    Scans inventory for products under threshold (default 5 units) and sends warehouse email alert.
    """
    from django.core.mail import send_mail
    from django.conf import settings

    low_items = Inventory.objects.filter(stock_level__lte=threshold).select_related('product')
    count = low_items.count()

    if count > 0:
        item_rows = "\n".join([f"- {inv.product.title} (SKU: {inv.product.sku}): {inv.stock_level} units left" for inv in low_items if inv.product])
        subject = f"⚠️ Warehouse Alert: {count} Products Low on Stock"
        message = f"Attention Warehouse Team,\n\nThe following items have fallen below {threshold} units in inventory:\n\n{item_rows}\n\nPlease restock these items soon."

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.DEFAULT_FROM_EMAIL],
                fail_silently=True
            )
        except Exception as exc:
            pass

    return {'status': 'completed', 'low_stock_count': count}


@shared_task(queue='default', name='apps.shop.tasks.sync_media_files_to_r2_task')
def sync_media_files_to_r2_task():
    """
    Automated periodic task to ensure any new images placed directly into
    local media/ are uploaded to Cloudflare R2 automatically.
    """
    from django.conf import settings
    if not getattr(settings, 'USE_R2', False):
        return 'USE_R2 disabled'
    from django.core.management import call_command
    try:
        call_command('sync_media_to_r2', concurrency=8)
        return 'Synced to R2'
    except Exception as exc:
        return f'Sync error: {exc}'


