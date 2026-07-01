"""
Shop signals — triggers embedding generation on Product save.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Product


@receiver(post_save, sender=Product)
def trigger_embedding_generation(sender, instance: Product, created: bool, **kwargs):
    """
    Enqueue an embedding generation task whenever a Product is
    created or its title/description changes.
    """
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

    generate_product_embeddings.apply_async(
        args=[str(instance.id)],
        queue='ai_tasks',
    )
