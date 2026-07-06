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
    image = models.FileField(upload_to='products/', null=True, blank=True)
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
    image = models.FileField(upload_to='products/')
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


class Collection(models.Model):
    """
    Product collection — groups products either manually (M2M) or by
    rule-based matching on product attribute fields.
    """
    MATCH_TYPE_CHOICES = [
        ('manual', 'Manual'),
        ('gender', 'Gender'),
        ('brand', 'Brand'),
        ('category', 'Category'),
        ('product_type', 'Product Type'),
        ('tag', 'Tag'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=500)
    slug = models.SlugField(max_length=500, unique=True, db_index=True)
    description = models.TextField(blank=True)
    image = models.FileField(upload_to='collections/', null=True, blank=True)
    match_type = models.CharField(max_length=20, choices=MATCH_TYPE_CHOICES, default='manual')
    match_value = models.CharField(max_length=500, blank=True, default='')
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.IntegerField(default=0)
    products = models.ManyToManyField(Product, blank=True, related_name='collections')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_collection'
        ordering = ['sort_order', '-created_at']
        verbose_name = 'Collection'
        verbose_name_plural = 'Collections'

    def __str__(self) -> str:
        return self.title

    def get_products(self):
        """Resolve products based on match_type."""
        base = Product.objects.filter(is_online=True)
        if self.match_type == 'manual':
            return self.products.filter(is_online=True)
        elif self.match_type == 'gender':
            return base.filter(attributes__gender__iexact=self.match_value)
        elif self.match_type == 'brand':
            return base.filter(attributes__brand__iexact=self.match_value)
        elif self.match_type == 'category':
            return base.filter(attributes__category__iexact=self.match_value)
        elif self.match_type == 'product_type':
            return base.filter(attributes__productType__iexact=self.match_value)
        elif self.match_type == 'tag':
            return base.filter(attributes__tags__contains=[self.match_value])
        return base.none()


class AutoCollection(models.Model):
    COLLECTION_TYPE_CHOICES = [
        ('brand', 'Brand'),
        ('category', 'Category'),
        ('gender', 'Gender'),
        ('type', 'Type'),
        ('note', 'Note'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=500, unique=True, db_index=True)
    collection_type = models.CharField(max_length=50, choices=COLLECTION_TYPE_CHOICES)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='collections/', blank=True, null=True)
    seo_title = models.CharField(max_length=255, blank=True, null=True)
    seo_description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='active')
    products = models.ManyToManyField(Product, through='ProductCollection', related_name='auto_collections')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'collections'


class ProductCollection(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    collection = models.ForeignKey(AutoCollection, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_collections'
        unique_together = ('product', 'collection')

