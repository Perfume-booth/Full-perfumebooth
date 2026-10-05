"""
Shop Domain Models
──────────────────
Product   — catalog item with pgvector embedding for AI search
Inventory — stock levels per product (1-to-1)
"""
import uuid
# pyrefly: ignore [missing-import]
from django.db import models
# pyrefly: ignore [missing-import]
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
    created_by = models.ForeignKey(
        'authentication.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_products'
    )
    updated_by = models.ForeignKey(
        'authentication.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_products'
    )
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


class ProductVariant(models.Model):
    """
    Specific SKU / Option variant (e.g. 50ml, 100ml, 200ml) for a parent Product.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='variants', db_index=True
    )
    title = models.CharField(max_length=255, default='Default Title')
    option1_name = models.CharField(max_length=100, default='Size')
    option1_value = models.CharField(max_length=100, default='100ml')
    option2_name = models.CharField(max_length=100, blank=True, default='')
    option2_value = models.CharField(max_length=100, blank=True, default='')
    sku = models.CharField(max_length=200, db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    stock_level = models.PositiveIntegerField(default=0)
    reserved_stock = models.PositiveIntegerField(default=0)
    image = models.FileField(upload_to='variants/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_product_variant'
        ordering = ['created_at']
        verbose_name = 'Product Variant'
        verbose_name_plural = 'Product Variants'

    def __str__(self) -> str:
        return f"{self.product.title} — {self.option1_value} ({self.sku})"

    @property
    def available_stock(self) -> int:
        return max(self.stock_level - self.reserved_stock, 0)


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
    excluded_products = models.JSONField(default=list, blank=True)
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
        if self.excluded_products:
            base = base.exclude(id__in=self.excluded_products)
        if self.match_type == 'manual':
            qs = self.products.filter(is_online=True)
            if self.excluded_products:
                qs = qs.exclude(id__in=self.excluded_products)
            return qs
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
    excluded_products = models.JSONField(default=list, blank=True)
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

class PageBanner(models.Model):
    """
    A specific CMS-managed banner for a specific page slug (e.g. 'men', 'al-haramain').
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    page_slug = models.CharField(max_length=255, unique=True, help_text="The URL slug of the page (e.g., 'men', 'al-haramain', 'all')")
    title = models.CharField(max_length=255, blank=True, null=True, help_text="Optional title for internal reference")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_page_banner'
        verbose_name = 'Page Banner'
        verbose_name_plural = 'Page Banners'

    def __str__(self) -> str:
        return f"Banner for /{self.page_slug} ({self.title or 'No Title'})"


class PageBannerImage(models.Model):
    """
    Individual images in a PageBanner (allowing for slideshows).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    banner = models.ForeignKey(PageBanner, on_delete=models.CASCADE, related_name='images')
    image = models.FileField(upload_to='banners/')
    mobile_image = models.FileField(upload_to='banners/mobile/', null=True, blank=True)
    sort_order = models.IntegerField(default=0)
    link_url = models.CharField(max_length=500, blank=True, null=True, help_text="Optional link when clicking the banner image")

    class Meta:
        db_table = 'shop_page_banner_image'
        ordering = ['sort_order']
        verbose_name = 'Banner Image'
        verbose_name_plural = 'Banner Images'

    def __str__(self) -> str:
        return f"Image for {self.banner.page_slug} (Order: {self.sort_order})"


class WishlistItem(models.Model):
    """
    Stores user's saved wishlist products.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'authentication.CustomUser',
        on_delete=models.CASCADE,
        related_name='wishlist_items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlisted_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shop_wishlist'
        unique_together = ('user', 'product')
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Wishlist item {self.product.title} for {self.user.email}"


class ProductReview(models.Model):
    """
    Customer product ratings and written reviews.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    user = models.ForeignKey(
        'authentication.CustomUser',
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.PositiveSmallIntegerField(help_text="1 to 5 star rating")
    title = models.CharField(max_length=255, blank=True, default='')
    comment = models.TextField(blank=True, default='')
    is_verified_buyer = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_product_review'
        unique_together = ('user', 'product')
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.rating}* Review for {self.product.title} by {self.user.email}"
