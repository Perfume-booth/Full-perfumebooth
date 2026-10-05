from django.contrib import admin

from .models import InventoryMovement, InventoryReservation


@admin.register(InventoryReservation)
class InventoryReservationAdmin(admin.ModelAdmin):
    list_display = ('order', 'product', 'variant', 'quantity', 'status', 'expires_at')
    list_filter = ('status', 'expires_at')
    search_fields = ('order__order_number', 'product__title', 'variant__sku')
    readonly_fields = ('created_at', 'updated_at', 'committed_at', 'released_at')


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = (
        'created_at', 'movement_type', 'product', 'variant',
        'stock_delta', 'reserved_delta', 'stock_after', 'reserved_after',
    )
    list_filter = ('movement_type', 'created_at')
    search_fields = ('order__order_number', 'product__title', 'variant__sku')
    readonly_fields = [field.name for field in InventoryMovement._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
