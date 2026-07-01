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

from .models import Product, Inventory


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
    total_records = len(csv_data) - 1  # Exclude header row
    processed = 0

    for row in reader:
        with transaction.atomic():
            product, _ = Product.objects.update_or_create(
                slug=row['slug'],
                defaults={
                    'title': row['title'],
                    'description': row.get('description', ''),
                    'price': float(row['price']),
                    'sku': row.get('sku', row['slug']),
                    'is_online': row.get('is_online', 'true').lower() == 'true',
                },
            )
            Inventory.objects.update_or_create(
                product=product,
                defaults={'stock_level': int(row.get('stock_level', 0))},
            )

        processed += 1
        # Publish progress for frontend polling
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
