"""
Headless CMS Models
─────────────────────
CMSPage    — a published page (homepage, /about, etc.)
CMSSection — ordered layout sections within a page (JSONB payload)
"""
import uuid
# pyrefly: ignore [missing-import]
from django.db import models


class CMSPage(models.Model):
    """
    Top-level page entity.
    Each page is identified by a slug and carries SEO metadata.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True, db_index=True)
    meta_title = models.CharField(max_length=300, blank=True)
    meta_description = models.TextField(blank=True)
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cms_page'
        ordering = ['slug']
        verbose_name = 'CMS Page'
        verbose_name_plural = 'CMS Pages'

    def __str__(self) -> str:
        status = '✓' if self.is_published else '✗'
        return f'[{status}] {self.title} (/{self.slug})'


class CMSSection(models.Model):
    """
    A content block within a CMS page.

    type examples:
        HeroBanner, ProductCarousel, TextBlock,
        BrandLogos, InstagramFeed, TestimonialSlider

    content_payload is a free-form JSONB object whose schema
    varies by section type — no migration needed for new fields.
    """

    class SectionType(models.TextChoices):
        HERO_BANNER        = 'HeroBanner',        'Hero Banner'
        PRODUCT_CAROUSEL   = 'ProductCarousel',   'Product Carousel'
        TEXT_BLOCK         = 'TextBlock',          'Text Block'
        BRAND_LOGOS        = 'BrandLogos',         'Brand Logos'
        INSTAGRAM_FEED     = 'InstagramFeed',      'Instagram Feed'
        TESTIMONIAL_SLIDER = 'TestimonialSlider',  'Testimonial Slider'
        CUSTOM             = 'Custom',             'Custom'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    page = models.ForeignKey(
        CMSPage, on_delete=models.CASCADE, related_name='sections', db_index=True
    )
    type = models.CharField(max_length=50, choices=SectionType.choices)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    content_payload = models.JSONField(default=dict)
    is_visible = models.BooleanField(default=True)

    class Meta:
        db_table = 'cms_section'
        ordering = ['sort_order']
        verbose_name = 'CMS Section'
        verbose_name_plural = 'CMS Sections'
    def __str__(self) -> str:
        return f'{self.page.slug} → [{self.sort_order}] {self.type}'
