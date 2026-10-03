"""
Inventory Service — Stock Locking and Decrementing
Guarantees race-condition-safe inventory deductions using SELECT FOR UPDATE row-level locking.
"""
from dataclasses import dataclass
from typing import Optional, List
from django.db import transaction

from apps.shop.models import Product, ProductVariant, Inventory
from ..validators import CartItemInput
from ..exceptions import (
    ProductNotFoundException,
    ProductUnavailableException,
    VariantNotFoundException,
    InsufficientStockException,
)


@dataclass
class LockedStockItem:
    product: Product
    variant: Optional[ProductVariant]
    inventory: Optional[Inventory]
    quantity: int


class InventoryService:
    """
    Handles locking inventory rows, validating stock quantities,
    and decrementing stock within a transactional boundary.
    """

    @classmethod
    def lock_and_validate_stock(cls, items: List[CartItemInput]) -> List[LockedStockItem]:
        """
        Locks inventory rows with select_for_update() and verifies available stock.
        Must be called within an active transaction.atomic() context.
        """
        locked_items: List[LockedStockItem] = []

        for item in items:
            try:
                product = Product.objects.get(id=item.product_id)
            except Product.DoesNotExist:
                raise ProductNotFoundException(item.product_id)

            if not product.is_online:
                raise ProductUnavailableException(item.product_id)

            if item.variant_id:
                try:
                    variant = (
                        ProductVariant.objects
                        .select_for_update()
                        .get(id=item.variant_id, product=product)
                    )
                except ProductVariant.DoesNotExist:
                    raise VariantNotFoundException(product.title, item.variant_id)

                if variant.stock_level < item.quantity:
                    raise InsufficientStockException(
                        product_title=product.title,
                        available=variant.stock_level,
                        requested=item.quantity,
                        variant_title=variant.title
                    )

                locked_items.append(LockedStockItem(
                    product=product,
                    variant=variant,
                    inventory=None,
                    quantity=item.quantity
                ))
            else:
                try:
                    inventory = Inventory.objects.select_for_update().get(product=product)
                except Inventory.DoesNotExist:
                    raise ProductUnavailableException(
                        item.product_id,
                        'Inventory is not configured for this product.'
                    )

                if inventory.available_stock < item.quantity:
                    raise InsufficientStockException(
                        product_title=product.title,
                        available=inventory.available_stock,
                        requested=item.quantity
                    )

                locked_items.append(LockedStockItem(
                    product=product,
                    variant=None,
                    inventory=inventory,
                    quantity=item.quantity
                ))

        return locked_items

    @classmethod
    def decrement_stock(cls, locked_items: List[LockedStockItem]) -> None:
        """
        Deducts purchased quantities from locked variant or inventory records.
        """
        for item in locked_items:
            if item.variant:
                item.variant.stock_level -= item.quantity
                item.variant.save(update_fields=['stock_level'])
            elif item.inventory:
                item.inventory.stock_level -= item.quantity
                item.inventory.save(update_fields=['stock_level'])
