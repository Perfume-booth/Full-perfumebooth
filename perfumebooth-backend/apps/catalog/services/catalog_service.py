"""
Catalog Service — Querying, filtering, searching, serialization, and management of catalog products.
"""
import json
import logging
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from django.db.models import Q, Count
from django.core.cache import cache
from rest_framework.exceptions import ValidationError

from apps.shop.models import (
    Product, Inventory, ProductImage, ProductVariant,
    Collection, AutoCollection
)
from apps.shop.services import CollectionSyncService
from apps.authentication.helpers import log_action
from core.validators import validate_image_upload
from .brand_service import BrandService

logger = logging.getLogger(__name__)


def auto_generate_tags(attributes: dict) -> list:
    """
    Intelligently generates collection-matching tags from existing product attributes.
    Preserves existing tags and adds newly derived attributes.
    """
    if not isinstance(attributes, dict):
        return []

    tags = []
    existing_tags = attributes.get('tags', [])
    if isinstance(existing_tags, list):
        tags.extend(existing_tags)
    elif isinstance(existing_tags, str):
        tags.extend([t.strip() for t in existing_tags.split(',') if t.strip()])

    def add_if_val(val):
        if val and isinstance(val, str) and val.strip():
            tags.append(val.strip())

    add_if_val(attributes.get('brand'))
    add_if_val(attributes.get('vendor'))
    add_if_val(attributes.get('category'))
    add_if_val(attributes.get('gender'))
    add_if_val(attributes.get('productType'))
    add_if_val(attributes.get('type'))
    add_if_val(attributes.get('concentration'))
    add_if_val(attributes.get('occasion'))
    add_if_val(attributes.get('season'))

    for note_field in ['top_notes', 'middle_notes', 'base_notes']:
        field_val = attributes.get(note_field, '')
        if field_val and isinstance(field_val, str):
            for note in field_val.split(','):
                add_if_val(note)

    seen = set()
    unique = []
    for t in tags:
        key = t.lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(t)
    return unique


class CatalogService:
    """Core domain service for querying, mutating, and serializing product catalog records."""

    @classmethod
    def serialize_product(cls, product: Product, request=None) -> dict:
        """
        Extracts nested data from the attributes JSONB field and flattens it
        so the API response matches the storefront's expected TypeScript interface.
        """
        images_data = []
        for img in product.images.all():
            img_url = None
            if img.image:
                img_url = request.build_absolute_uri(img.image.url) if request else img.image.url
            images_data.append({
                'url': img_url,
                'altText': img.alt_text,
                'width': img.width,
                'height': img.height
            })

        variants_data = []
        for var in product.variants.all():
            variants_data.append({
                'id': str(var.id),
                'title': var.title,
                'option1_name': var.option1_name,
                'option1_value': var.option1_value,
                'option2_name': var.option2_name,
                'option2_value': var.option2_value,
                'sku': var.sku,
                'price': str(var.price),
                'compare_at_price': str(var.compare_at_price) if var.compare_at_price else None,
                'stock': var.available_stock,
            })

        attrs = product.attributes or {}
        stock_val = 0
        if hasattr(product, 'inventory') and product.inventory:
            stock_val = product.inventory.stock_level

        image_url = None
        if product.image:
            image_url = request.build_absolute_uri(product.image.url) if request else product.image.url

        return {
            'id': str(product.id),
            'title': product.title,
            'slug': product.slug,
            'sku': product.sku,
            'description': product.description,
            'price': str(product.price),
            'compare_at_price': str(product.compare_at_price) if product.compare_at_price else None,
            'image': image_url,
            'images': images_data,
            'variants': variants_data,
            'stock': stock_val,
            'is_online': product.is_online,
            'brand': attrs.get('brand') or attrs.get('vendor', ''),
            'category': attrs.get('category', ''),
            'gender': attrs.get('gender', ''),
            'productType': attrs.get('productType') or attrs.get('type', ''),
            'concentration': attrs.get('concentration', ''),
            'top_notes': attrs.get('top_notes', ''),
            'middle_notes': attrs.get('middle_notes', ''),
            'base_notes': attrs.get('base_notes', ''),
            'occasion': attrs.get('occasion', ''),
            'season': attrs.get('season', ''),
            'tags': attrs.get('tags', []),
            'attributes': attrs,
            'created_at': product.created_at.isoformat() if product.created_at else None,
            'updated_at': product.updated_at.isoformat() if product.updated_at else None,
        }

    @classmethod
    def get_products(cls,
                     search_query: str = '',
                     stock_status: str = '',
                     brand: str = '',
                     status_filter: str = '',
                     page: int = 1,
                     page_size: int = 50,
                     paginate: bool = False,
                     is_merchant: bool = False,
                     request=None) -> Any:
        """
        Retrieves products applying visibility, search, stock level, and brand filters.
        """
        cache_key = (
            f'catalog:products:page:{page}:size:{page_size}:search:{search_query}:'
            f'stock:{stock_status}:brand:{brand}:status:{status_filter}:paginated:{paginate}'
        )
        cached = cache.get(cache_key)
        if cached:
            return cached

        products = (
            Product.objects
            .select_related('created_by', 'updated_by')
            .prefetch_related('images', 'variants', 'created_by__roles__role', 'updated_by__roles__role')
            .order_by('title')
        )

        if not is_merchant:
            products = products.filter(is_online=True)
        else:
            if status_filter == 'online':
                products = products.filter(is_online=True)
            elif status_filter == 'offline':
                products = products.filter(is_online=False)

        if search_query:
            products = products.filter(
                Q(title__icontains=search_query) |
                Q(sku__icontains=search_query) |
                Q(attributes__brand__icontains=search_query)
            )

        if stock_status == 'low':
            products = products.filter(inventory__stock_level__gt=0, inventory__stock_level__lte=10)
        elif stock_status == 'out':
            products = products.filter(inventory__stock_level=0)

        if brand:
            products = products.filter(attributes__brand=brand)

        if not paginate:
            data = [cls.serialize_product(p, request) for p in products]
            cache.set(cache_key, data, timeout=7200)
            return data

        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        paginated_products = products[start:end]

        results = [cls.serialize_product(p, request) for p in paginated_products]
        response_data = {
            'results': results,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if page_size else 1
        }
        cache.set(cache_key, response_data, timeout=30)
        return response_data

    @classmethod
    def get_product_by_slug(cls, slug: str, request=None, is_merchant: bool = False) -> Optional[dict]:
        cache_key = f'catalog:product:{slug}'
        cached = cache.get(cache_key)
        if cached:
            return cached

        query = Product.objects.prefetch_related('images', 'variants')
        if not is_merchant:
            query = query.filter(is_online=True)

        try:
            product = query.get(slug=slug)
        except Product.DoesNotExist:
            return None

        data = cls.serialize_product(product, request)
        cache.set(cache_key, data, timeout=7200)
        return data

    @classmethod
    def create_product(cls, data: dict, files: dict, user=None, request=None) -> Tuple[Product, bool]:
        title = data.get('title')
        slug = data.get('slug')
        sku = data.get('sku')
        price = data.get('price')
        compare_at_price = data.get('compare_at_price')
        description = data.get('description', '')
        is_online = str(data.get('is_online', 'true')).lower() == 'true'

        attributes = data.get('attributes', '{}')
        if isinstance(attributes, str):
            try:
                attributes = json.loads(attributes)
            except json.JSONDecodeError:
                attributes = {}

        attributes['tags'] = auto_generate_tags(attributes)

        if 'image' in files:
            validate_image_upload(files['image'])

        gallery_images = files.getlist('gallery') if hasattr(files, 'getlist') else []
        for img in gallery_images:
            validate_image_upload(img)

        product = Product.objects.create(
            title=title,
            slug=slug,
            sku=sku,
            price=price,
            compare_at_price=compare_at_price if compare_at_price else None,
            description=description,
            is_online=is_online,
            attributes=attributes,
            image=files.get('image'),
            created_by=user,
            updated_by=user
        )

        brand_name = attributes.get('brand') or attributes.get('vendor')
        if brand_name:
            BrandService.save_brand(brand_name)

        stock_level = int(data.get('stock_level', 0))
        Inventory.objects.create(product=product, stock_level=stock_level)

        for img in gallery_images:
            ProductImage.objects.create(product=product, image=img)

        variants_json = data.get('variants')
        if variants_json:
            if isinstance(variants_json, str):
                try:
                    variants_list = json.loads(variants_json)
                except Exception:
                    variants_list = []
            elif isinstance(variants_json, list):
                variants_list = variants_json
            else:
                variants_list = []

            for v_data in variants_list:
                ProductVariant.objects.create(
                    product=product,
                    title=v_data.get('title', 'Default Title'),
                    option1_name=v_data.get('option1_name', 'Size'),
                    option1_value=v_data.get('option1_value', '100ml'),
                    option2_name=v_data.get('option2_name', ''),
                    option2_value=v_data.get('option2_value', ''),
                    sku=v_data.get('sku') or f"{product.sku}-{v_data.get('option1_value', '1')}",
                    price=Decimal(str(v_data.get('price') or product.price)),
                    compare_at_price=Decimal(str(v_data.get('compare_at_price'))) if v_data.get('compare_at_price') else None,
                    stock_level=int(v_data.get('stock') or 0),
                )

        synced = CollectionSyncService.syncProductCollections(product)
        cache.clear()
        if user and request:
            log_action(user, f"Created product '{product.title}' (SKU: {product.sku})", request)
        return product, synced

    @classmethod
    def update_product(cls, slug: str, data: dict, files: dict, user=None, request=None) -> Tuple[Optional[Product], bool]:
        try:
            product = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return None, False

        product.title = data.get('title', product.title)
        product.sku = data.get('sku', product.sku)
        product.price = data.get('price', product.price)
        product.compare_at_price = data.get('compare_at_price', product.compare_at_price)
        product.description = data.get('description', product.description)
        product.is_online = str(data.get('is_online', product.is_online)).lower() == 'true'

        if 'image' in files:
            validate_image_upload(files['image'])
            product.image = files['image']

        gallery_images = files.getlist('gallery') if hasattr(files, 'getlist') else []
        for img in gallery_images:
            validate_image_upload(img)

        attributes = data.get('attributes')
        if attributes:
            if isinstance(attributes, str):
                try:
                    attributes = json.loads(attributes)
                except json.JSONDecodeError:
                    attributes = None
            if isinstance(attributes, dict):
                attributes['tags'] = auto_generate_tags(attributes)
                product.attributes = attributes

        if user:
            product.updated_by = user
        product.save()

        if product.attributes:
            brand_name = product.attributes.get('brand') or product.attributes.get('vendor')
            if brand_name:
                BrandService.save_brand(brand_name)

        if 'stock_level' in data:
            stock = int(data['stock_level'])
            Inventory.objects.update_or_create(product=product, defaults={'stock_level': stock})

        for img in gallery_images:
            ProductImage.objects.create(product=product, image=img)

        variants_json = data.get('variants')
        if variants_json:
            if isinstance(variants_json, str):
                try:
                    variants_list = json.loads(variants_json)
                except Exception:
                    variants_list = []
            elif isinstance(variants_json, list):
                variants_list = variants_json
            else:
                variants_list = []

            if variants_list:
                product.variants.all().delete()
                for v_data in variants_list:
                    ProductVariant.objects.create(
                        product=product,
                        title=v_data.get('title', 'Default Title'),
                        option1_name=v_data.get('option1_name', 'Size'),
                        option1_value=v_data.get('option1_value', '100ml'),
                        option2_name=v_data.get('option2_name', ''),
                        option2_value=v_data.get('option2_value', ''),
                        sku=v_data.get('sku') or f"{product.sku}-{v_data.get('option1_value', '1')}",
                        price=Decimal(str(v_data.get('price') or product.price)),
                        compare_at_price=Decimal(str(v_data.get('compare_at_price'))) if v_data.get('compare_at_price') else None,
                        stock_level=int(v_data.get('stock') or 0),
                    )

        synced = CollectionSyncService.syncProductCollections(product)
        cache.clear()
        if user and request:
            log_action(user, f"Updated product '{product.title}' (SKU: {product.sku})", request)
        return product, synced

    @classmethod
    def delete_product(cls, slug: str, user=None, request=None) -> bool:
        try:
            product = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return False

        title, sku = product.title, product.sku
        product.delete()

        AutoCollection.objects.annotate(num_products=Count('products')).filter(num_products=0).delete()
        Collection.objects.annotate(num_products=Count('products')).filter(num_products=0).delete()

        cache.clear()
        if user and request:
            log_action(user, f"Deleted product '{title}' (SKU: {sku})", request)
        return True

    @classmethod
    def bulk_delete_products(cls, slugs: list, user=None, request=None) -> int:
        if not slugs:
            return 0
        count, _ = Product.objects.filter(slug__in=slugs).delete()
        AutoCollection.objects.annotate(num_products=Count('products')).filter(num_products=0).delete()
        Collection.objects.annotate(num_products=Count('products')).filter(num_products=0).delete()
        cache.clear()
        if user and request:
            log_action(user, f"Bulk deleted {count} products", request)
        return count

    @classmethod
    def bulk_patch_products(cls, slugs: list, patch_data: dict, user=None, request=None) -> Tuple[bool, str, int]:
        if not slugs:
            return False, "No products selected.", 0

        is_online = patch_data.get('is_online')
        price_adjustment = patch_data.get('price_adjustment')
        stock_adjustment = patch_data.get('stock_adjustment')

        if is_online is not None:
            is_online_bool = str(is_online).lower() == 'true'
            count = Product.objects.filter(slug__in=slugs).update(is_online=is_online_bool)
            cache.clear()
            action_word = "published" if is_online_bool else "unpublished"
            if user and request:
                log_action(user, f"Bulk {action_word} {count} products", request)
            return True, f"Successfully {action_word} {count} products.", count

        if price_adjustment:
            action = price_adjustment.get('action')
            val = float(price_adjustment.get('value', 0))
            products = Product.objects.filter(slug__in=slugs)
            count = 0
            for p in products:
                if action == 'percent_discount':
                    p.compare_at_price = p.price
                    p.price = p.price * Decimal(1 - val / 100)
                elif action == 'fixed_discount':
                    p.compare_at_price = p.price
                    p.price = max(p.price - Decimal(val), Decimal(0))
                elif action == 'set_compare':
                    p.compare_at_price = Decimal(val)
                p.save()
                count += 1
            cache.clear()
            if user and request:
                log_action(user, f"Bulk adjusted price for {count} products", request)
            return True, f"Successfully adjusted price for {count} products.", count

        if stock_adjustment:
            action = stock_adjustment.get('action')
            val = int(stock_adjustment.get('value', 0))
            products = Product.objects.filter(slug__in=slugs)
            count = 0
            for p in products:
                inventory = getattr(p, 'inventory', None)
                if inventory:
                    if action == 'set':
                        inventory.stock_level = max(val, 0)
                    elif action == 'add':
                        inventory.stock_level = max(inventory.stock_level + val, 0)
                    inventory.save()
                    count += 1
            cache.clear()
            if user and request:
                log_action(user, f"Bulk adjusted stock level for {count} products", request)
            return True, f"Successfully adjusted stock level for {count} products.", count

        return False, "No valid action provided.", 0
