from django.contrib import admin
from .models import CMSPage, CMSSection


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
