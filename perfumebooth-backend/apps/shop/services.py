"""
Shop Services — Business Logic Layer
─────────────────────────────────────
deduct_product_stock        — Pessimistic locking stock deduction
find_semantically_similar   — pgvector cosine similarity search
"""
from django.db import transaction
from django.core.exceptions import ValidationError
from pgvector.django import CosineDistance

from .models import Inventory, Product


def deduct_product_stock(product_id: str, quantity: int) -> Inventory:
    """
    Concurrency-safe stock deduction using database row-level locking.

    Uses SELECT FOR UPDATE to block concurrent writes on the same
    Inventory row, preventing overselling during peak checkout traffic.

    Args:
        product_id: UUID of the product to deduct stock from.
        quantity:   Number of units to deduct.

    Returns:
        The updated Inventory instance.

    Raises:
        ValidationError: If available stock is less than requested quantity.
        Inventory.DoesNotExist: If no inventory record exists for the product.
    """
    with transaction.atomic():
        inventory = (
            Inventory.objects
            .select_for_update()          # Acquires a row-level PG lock
            .get(product_id=product_id)
        )

        if inventory.stock_level < quantity:
            raise ValidationError(
                f'Insufficient stock for product {product_id}. '
                f'Available: {inventory.stock_level}, Requested: {quantity}.'
            )

        inventory.stock_level -= quantity
        inventory.save(update_fields=['stock_level', 'updated_at'])

    return inventory


def find_semantically_similar_products(
    query_vector: list[float],
    limit: int = 4,
    only_online: bool = True,
) -> 'QuerySet[Product]':
    """
    Semantic product search using pgvector cosine distance.

    Args:
        query_vector: Float vector generated from the user's query text.
        limit:        Maximum number of results to return.
        only_online:  Filter to only include published products.

    Returns:
        QuerySet of Products ordered by cosine similarity (closest first).
    """
    qs = Product.objects.filter(embedding__isnull=False)
    if only_online:
        qs = qs.filter(is_online=True)

    return (
        qs
        .annotate(distance=CosineDistance('embedding', query_vector))
        .order_by('distance')
        [:limit]
    )
