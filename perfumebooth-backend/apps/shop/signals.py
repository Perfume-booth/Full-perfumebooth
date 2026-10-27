import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Product

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Product)
def trigger_embedding_generation(sender, instance: Product, created: bool, **kwargs):
    """
    Enqueue an embedding generation task whenever a Product is
    created or its title/description changes.
    """
    # Skip background Celery dispatch during test runs
    import sys
    if 'test' in sys.argv:
        return

    # Import here to avoid circular imports at module load time
    from .tasks import generate_product_embeddings

    # Only regenerate if embedding-relevant fields were touched
    update_fields = kwargs.get('update_fields')
    if update_fields and not any(
        f in update_fields for f in ('title', 'description', 'embedding')
    ):
        return

    if update_fields and 'embedding' in update_fields:
        return  # Avoid infinite loop when the task itself saves the embedding

    try:
        generate_product_embeddings.apply_async(
            args=[str(instance.id)],
            queue='ai_tasks',
        )
    except Exception as exc:
        logger.warning("Could not dispatch embedding task for product %s: %s", instance.id, exc)


def mirror_image_to_local_media_and_r2(field_file):
    """
    Ensure the image exists in BOTH local media storage AND Cloudflare R2.
    """
    if not field_file or not getattr(field_file, 'name', None):
        return
    import os
    import sys
    if 'test' in sys.argv:
        return
    from django.conf import settings
    media_root = str(settings.BASE_DIR / 'media')
    local_path = os.path.join(media_root, field_file.name)

    # 1. Mirror to local filesystem if not already present
    if not os.path.exists(local_path):
        try:
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with field_file.open('rb') as f:
                with open(local_path, 'wb') as lf:
                    lf.write(f.read())
        except Exception as exc:
            logger.debug("Local media mirroring skipped or failed for %s: %s", field_file.name, exc)

    # 2. Mirror to Cloudflare R2 if USE_R2 is True
    if getattr(settings, 'USE_R2', False):
        try:
            from django.core.files.storage import default_storage
            if not default_storage.exists(field_file.name) and os.path.exists(local_path):
                import boto3
                import mimetypes
                r2_client = boto3.client(
                    's3',
                    endpoint_url=settings.R2_S3_ENDPOINT_URL,
                    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                    region_name='auto'
                )
                ctype, _ = mimetypes.guess_type(local_path)
                with open(local_path, 'rb') as lf:
                    r2_client.put_object(
                        Bucket=settings.R2_STORAGE_BUCKET_NAME,
                        Key=field_file.name.replace('\\', '/'),
                        Body=lf.read(),
                        ContentType=ctype or 'image/jpeg'
                    )
        except Exception as exc:
            logger.debug("R2 mirroring skipped or failed for %s: %s", field_file.name, exc)


@receiver(post_save, sender=Product)
def mirror_product_image(sender, instance: Product, **kwargs):
    if instance.image:
        mirror_image_to_local_media_and_r2(instance.image)


from .models import ProductImage, ProductVariant


@receiver(post_save, sender=ProductImage)
def mirror_gallery_image(sender, instance: ProductImage, **kwargs):
    if instance.image:
        mirror_image_to_local_media_and_r2(instance.image)


@receiver(post_save, sender=ProductVariant)
def mirror_variant_image(sender, instance: ProductVariant, **kwargs):
    if instance.image:
        mirror_image_to_local_media_and_r2(instance.image)


