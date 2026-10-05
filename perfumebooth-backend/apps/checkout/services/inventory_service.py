"""
Inventory Service — Stock Locking and Validation
Guarantees race-condition-safe availability checks using SELECT FOR UPDATE row-level locking.
"""
from dataclasses import dataclass
from typing import Optional, List
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
    Handles locking inventory rows and validating stock quantities within a
    transactional boundary. Reservation and deduction are owned by the
    inventory domain service.
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

                if variant.available_stock < item.quantity:
                    raise InsufficientStockException(
                        product_title=product.title,
                        available=variant.available_stock,
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
