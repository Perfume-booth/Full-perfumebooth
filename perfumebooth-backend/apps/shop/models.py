"""
Shop Domain Models
──────────────────
Product   — catalog item with pgvector embedding for AI search
Inventory — stock levels per product (1-to-1)
"""
import uuid
from django.db import models
from pgvector.django import VectorField


class Product(models.Model):
    """
    Core catalog item.
    - attributes: JSONB field (GIN indexed) for dynamic scent/volume metadata.
    - embedding:  384-dim float vector (HNSW indexed) for semantic search.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=500)
    slug = models.SlugField(max_length=500, unique=True, db_index=True)
    sku = models.CharField(max_length=200, unique=True, db_index=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, db_index=True)
    compare_at_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    # JSONB — stores dynamic attributes e.g. {"scent_notes": "Citrus", "volume_ml": 100}
    attributes = models.JSONField(default=dict)
    # pgvector — 384-dim embedding (sentence-transformers) or 1536-dim (OpenAI ada-002)
    embedding = VectorField(dimensions=384, null=True, blank=True)
    is_online = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_product'
        ordering = ['-created_at']
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        indexes = [
            models.Index(fields=['slug'], name='product_slug_idx'),
            models.Index(fields=['sku'], name='product_sku_idx'),
            models.Index(fields=['price'], name='product_price_idx'),
            models.Index(fields=['is_online'], name='product_online_idx'),
            # GIN index on attributes JSONB is added via a raw migration
            # HNSW index on embedding is added via a raw migration
        ]

    def __str__(self) -> str:
        return self.title


class Inventory(models.Model):
    """
    Stock levels for a product.
    One-to-one relationship: each Product has exactly one Inventory record.
    Uses SELECT FOR UPDATE for race-condition-safe deductions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, related_name='inventory', db_index=True
    )
    stock_level = models.PositiveIntegerField(default=0)
    reserved_stock = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_inventory'
        verbose_name = 'Inventory'
        verbose_name_plural = 'Inventories'

    def __str__(self) -> str:
        return f'{self.product.title} — Stock: {self.stock_level}'

    @property
    def available_stock(self) -> int:
        """Net available stock after subtracting reserved units."""
        return max(self.stock_level - self.reserved_stock, 0)


class ProductImage(models.Model):
    """
    Additional gallery images for a product.
    Stored on S3 (or local media).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='images', db_index=True
    )
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=500, blank=True, default='')
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_product_image'
        ordering = ['created_at']
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'

    def __str__(self) -> str:
        return f"Image for {self.product.title} ({self.id})"
