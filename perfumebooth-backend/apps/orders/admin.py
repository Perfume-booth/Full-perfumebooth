from django.contrib import admin
from .models import Order, OrderItem, Shipment


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ('product_title', 'variant_title', 'sku', 'quantity', 'unit_price', 'line_total')
    readonly_fields = ('product_title', 'variant_title', 'sku', 'line_total')


class ShipmentInline(admin.TabularInline):
    model = Shipment
    extra = 0
    fields = ('provider', 'status', 'awb_code', 'courier_name', 'tracking_url')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'customer_email', 'status', 'payment_status', 'total', 'currency', 'created_at')
    list_filter = ('status', 'payment_status', 'payment_method', 'currency', 'created_at')
    search_fields = ('order_number', 'customer_email', 'customer_phone', 'payment_intent_id')
    readonly_fields = ('order_number', 'payment_intent_id', 'created_at', 'updated_at')
    inlines = [OrderItemInline, ShipmentInline]
    fieldsets = (
        ('Order Header', {
            'fields': ('order_number', 'user', 'status', 'created_at', 'updated_at')
        }),
        ('Totals', {
            'fields': ('subtotal', 'discount_amount', 'shipping_amount', 'tax_amount', 'total', 'currency')
        }),
        ('Payment & Integration', {
            'fields': ('payment_method', 'payment_status', 'payment_intent_id')
        }),
        ('Shipping Details', {
            'fields': ('customer_email', 'customer_phone', 'shipping_address')
        }),
    )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product_title', 'variant_title', 'sku', 'quantity', 'unit_price')
    search_fields = ('order__order_number', 'product_title', 'variant_title', 'sku')


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ('order', 'provider', 'status', 'awb_code', 'courier_name', 'updated_at')
    list_filter = ('provider', 'status')
    search_fields = ('order__order_number', 'provider_order_id', 'provider_shipment_id', 'awb_code')
