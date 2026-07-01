from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ('product', 'quantity', 'unit_price', 'line_total')
    readonly_fields = ('line_total',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user', 'status', 'total', 'payment_intent_id', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order_number', 'user__email', 'payment_intent_id')
    readonly_fields = ('order_number', 'payment_intent_id', 'created_at', 'updated_at')
    inlines = [OrderItemInline]
    fieldsets = (
        ('Order Header', {
            'fields': ('order_number', 'user', 'status', 'created_at', 'updated_at')
        }),
        ('Totals', {
            'fields': ('subtotal', 'tax', 'total')
        }),
        ('Payment & Integration', {
            'fields': ('payment_intent_id',)
        }),
        ('Shipping Details', {
            'fields': ('shipping_address',)
        }),
    )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product', 'quantity', 'unit_price')
    search_fields = ('order__order_number', 'product__title')
