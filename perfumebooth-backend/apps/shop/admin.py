from django.contrib import admin
from .models import Product, Inventory, ProductImage


class InventoryInline(admin.StackedInline):
    model = Inventory
    can_delete = False
    verbose_name_plural = 'Inventory'
    fields = ('stock_level', 'reserved_stock')


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image', 'alt_text', 'width', 'height')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'sku', 'price', 'is_online', 'created_at')
    list_filter = ('is_online', 'created_at')
    search_fields = ('title', 'sku', 'slug')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [InventoryInline, ProductImageInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'sku', 'description')
        }),
        ('Pricing', {
            'fields': ('price', 'compare_at_price')
        }),
        ('Featured Image', {
            'fields': ('image',)
        }),
        ('Metadata & AI Settings', {
            'fields': ('attributes', 'embedding', 'is_online')
        }),
    )

from .models import PageBanner, PageBannerImage

class PageBannerImageInline(admin.TabularInline):
    model = PageBannerImage
    extra = 1

@admin.register(PageBanner)
class PageBannerAdmin(admin.ModelAdmin):
    list_display = ('page_slug', 'title', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('page_slug', 'title')
    inlines = [PageBannerImageInline]
