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
        TOP_CATEGORIES     = 'TopCategories',     'Top Categories'
        GENDER_SECTION     = 'GenderSection',     'Gender Section'
        VIDEO_SECTION      = 'VideoSection',      'Video Section'
        NEW_LAUNCHES       = 'NewLaunches',       'New Launches'
        SCENT_GRID         = 'ScentGrid',         'Scent Grid'
        TRENDING_SECTION   = 'TrendingSection',   'Trending Section'
        BEST_SELLER_SECTION= 'BestSellerSection', 'Best Seller Section'
        RECENTLY_VIEWED    = 'RecentlyViewed',    'Recently Viewed'
        BRAND_SLIDER       = 'BrandSlider',       'Brand Slider'
        BLOG_SECTION       = 'BlogSection',       'Blog Section'
        INSTAGRAM_FEED     = 'InstagramFeed',      'Instagram Feed'
        PRODUCT_CAROUSEL   = 'ProductCarousel',   'Product Carousel'
        TEXT_BLOCK         = 'TextBlock',          'Text Block'
        BRAND_LOGOS        = 'BrandLogos',         'Brand Logos'
        TESTIMONIAL_SLIDER = 'TestimonialSlider',  'Testimonial Slider'
        RICH_TEXT          = 'RichText',          'Rich Text'
        CONTACT_CARD       = 'ContactCard',       'Contact Card'
        FAQ_LIST           = 'FaqList',           'FAQ List'
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


class BlogPost(models.Model):
    """
    Dedicated Blog Article Model for CMS Journal
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True, db_index=True)
    author = models.CharField(max_length=150, default='PerfumeBooth Editorial')
    cover_image = models.CharField(max_length=500, blank=True)
    excerpt = models.TextField(blank=True)
    content_html = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    read_time = models.CharField(max_length=50, default='5 min read')
    is_published = models.BooleanField(default=True, db_index=True)
    published_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cms_blog_post'
        ordering = ['-published_at']
        verbose_name = 'Blog Post'
        verbose_name_plural = 'Blog Posts'

    def __str__(self) -> str:
        status = '✓' if self.is_published else '✗'
        return f'[{status}] {self.title} (/blog/{self.slug})'


class ContactSubmission(models.Model):
    """
    Durable storage for customer inquiries submitted via contact and help forms.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        READ = 'read', 'Read'
        REPLIED = 'replied', 'Replied'
        ARCHIVED = 'archived', 'Archived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=50, blank=True, default='')
    subject = models.CharField(max_length=255, blank=True, default='General Inquiry')
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cms_contact_submission'
        ordering = ['-created_at']
        verbose_name = 'Contact Submission'
        verbose_name_plural = 'Contact Submissions'

    def __str__(self) -> str:
        return f"{self.name} <{self.email}> — {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class NewsletterSubscriber(models.Model):
    """
    Durable storage for newsletter subscribers in PostgreSQL.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    source = models.CharField(max_length=100, default='website_footer')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cms_newsletter_subscriber'
        ordering = ['-created_at']
        verbose_name = 'Newsletter Subscriber'
        verbose_name_plural = 'Newsletter Subscribers'

    def __str__(self) -> str:
        status = 'Active' if self.is_active else 'Unsubscribed'
        return f"{self.email} ({status})"


class NotificationSubscription(models.Model):
    """Confirmed consent and durable delivery state, separate from order email."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    kind = models.CharField(max_length=20, choices=[('newsletter', 'Newsletter'), ('restock', 'Restock')])
    target = models.CharField(max_length=50, default='newsletter')
    product = models.ForeignKey('shop.Product', null=True, blank=True, on_delete=models.CASCADE)
    variant = models.ForeignKey('shop.ProductVariant', null=True, blank=True, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_active = models.BooleanField(default=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    confirmation_state = models.CharField(max_length=20, default='pending', db_index=True)
    notification_state = models.CharField(max_length=20, default='pending', db_index=True)
    notified_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=100, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['email', 'kind', 'target'], name='unique_notification_subscription')]


class MediaFolder(models.Model):
    """
    Folder categorization for CMS media assets (Laravel Filament style).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cms_media_folder'
        ordering = ['name']
        verbose_name = 'Media Folder'
        verbose_name_plural = 'Media Folders'

    def __str__(self) -> str:
        return self.name


class MediaAsset(models.Model):
    """
    Media Library Asset representing uploaded photos, banners, logos, and graphics.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to='media_library/%Y/%m/')
    name = models.CharField(max_length=255)
    folder = models.CharField(max_length=100, default='general', db_index=True)
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cms_media_asset'
        ordering = ['-created_at']
        verbose_name = 'Media Asset'
        verbose_name_plural = 'Media Assets'

    def __str__(self) -> str:
        return f"[{self.folder}] {self.name}"

