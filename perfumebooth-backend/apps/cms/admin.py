from django.contrib import admin
from .models import CMSPage, CMSSection, BlogPost, ContactSubmission, NewsletterSubscriber


class CMSSectionInline(admin.TabularInline):
    model = CMSSection
    extra = 1
    fields = ('type', 'sort_order', 'is_visible', 'content_payload')


@admin.register(CMSPage)
class CMSPageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'is_published', 'published_at', 'created_at')
    list_filter = ('is_published', 'created_at', 'published_at')
    search_fields = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [CMSSectionInline]
    fieldsets = (
        ('Basic Settings', {
            'fields': ('title', 'slug', 'is_published', 'published_at')
        }),
        ('SEO & Metadata', {
            'fields': ('meta_title', 'meta_description')
        }),
    )


@admin.register(CMSSection)
class CMSSectionAdmin(admin.ModelAdmin):
    list_display = ('page', 'type', 'sort_order', 'is_visible')
    list_filter = ('type', 'is_visible', 'page')
    search_fields = ('page__slug', 'type')
    ordering = ('page', 'sort_order')


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'author', 'is_published', 'published_at')
    list_filter = ('is_published', 'published_at')
    search_fields = ('title', 'slug', 'author')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'email', 'phone', 'message')
    readonly_fields = ('created_at', 'updated_at', 'ip_address')


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ('email', 'is_active', 'source', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('email',)
    readonly_fields = ('created_at', 'updated_at')
