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
        attrs = product.attributes or {}
        image_url = None
        if product.image:
            try:
                image_url = request.build_absolute_uri(product.image.url) if request else product.image.url
            except Exception:
                image_url = None

        images_data = []
        if image_url:
            images_data.append({
                'url': image_url,
                'altText': attrs.get('image_alt_text') or product.title,
                'width': None,
                'height': None
            })

        for img in product.images.all():
            # Skip primary / position 1 image as it is already the main image (images_data[0])
            if img.is_primary or img.position == 1:
                continue
            img_url = None
            if img.image:
                try:
                    img_url = request.build_absolute_uri(img.image.url) if request else img.image.url
                except Exception:
                    img_url = None
            if img_url and img_url != image_url:
                images_data.append({
                    'url': img_url,
                    'altText': img.alt_text or product.title,
                    'width': img.width,
                    'height': img.height
                })

        if not image_url and images_data:
            image_url = images_data[0]['url']

        variants_data = []
        gallery_images_list = list(product.images.all())
        for idx, var in enumerate(product.variants.all()):
            var_image = None
            if var.image:
                try:
                    var_image = request.build_absolute_uri(var.image.url) if request else var.image.url
                except Exception:
                    var_image = None
            if not var_image and idx < len(gallery_images_list) and gallery_images_list[idx].image:
                try:
                    var_image = request.build_absolute_uri(gallery_images_list[idx].image.url) if request else gallery_images_list[idx].image.url
                except Exception:
                    var_image = None
            if not var_image and image_url:
                var_image = image_url
            variants_data.append({
                'id': str(var.id),
                'title': var.title,
                'option1_name': var.option1_name,
                'option1_value': var.option1_value,
                'option2_name': var.option2_name,
                'option2_value': var.option2_value,
                'sku': var.sku,
                'barcode': var.barcode or '',
                'price': str(var.price),
                'compare_at_price': str(var.compare_at_price) if var.compare_at_price else None,
                'cost_price': str(var.cost_price) if var.cost_price else None,
                'stock': var.available_stock,
                'weight': var.weight or '',
                'dimensions': var.dimensions or '',
                'is_default': var.is_default,
                'is_active': var.is_active,
                'image': var_image,
            })

        stock_val = 0
        if hasattr(product, 'inventory') and product.inventory:
            stock_val = product.inventory.available_stock

        return {
            'id': str(product.id),
            'title': product.title,
            'slug': product.slug,
            'sku': product.sku,
            'barcode': product.barcode or attrs.get('barcode', ''),
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
            'product_form': attrs.get('product_form', ''),
            'bottle_material': attrs.get('bottle_material', ''),
            'concentration': attrs.get('concentration', ''),
            'top_notes': attrs.get('top_notes', ''),
            'middle_notes': attrs.get('middle_notes', ''),
            'base_notes': attrs.get('base_notes', ''),
            'occasion': attrs.get('occasion', ''),
            'season': attrs.get('season', ''),
            'tags': attrs.get('tags', []),
            'weight': attrs.get('weight', ''),
            'shipping': attrs.get('shipping', {}),
            'collections': attrs.get('collections', []),
            'attributes': attrs,
            'created_at': product.created_at.isoformat() if product.created_at else None,
            'updated_at': product.updated_at.isoformat() if product.updated_at else None,
        }

    @classmethod
    def apply_search_query(cls, queryset, search_query: str):
        """
        Applies tokenization, pg_trgm fuzzy matching (typo tolerance),
        and weighted relevance ranking to the product queryset.
        """
        import re
        from django.db import connection
        from django.db.models import Case, When, Value, FloatField, F, Q

        clean = search_query.strip()
        if not clean:
            return queryset.order_by('title')

        # 1. Tokenization: Extract distinct lowercase tokens
        tokens = [t.lower() for t in re.split(r'[\s,\-_/|]+', clean) if len(t) >= 2]
        is_postgres = connection.vendor == 'postgresql'

        when_conditions = [
            # Exact matches (Highest priority)
            When(title__iexact=clean, then=Value(120.0)),
            When(attributes__brand__iexact=clean, then=Value(80.0)),

            # Prefix matches (Type-ahead priority)
            When(title__istartswith=clean, then=Value(60.0)),
            When(attributes__brand__istartswith=clean, then=Value(40.0)),

            # Substring matches
            When(title__icontains=clean, then=Value(35.0)),
            When(attributes__brand__icontains=clean, then=Value(25.0)),
            When(sku__icontains=clean, then=Value(40.0)),
            When(barcode__icontains=clean, then=Value(40.0)),
        ]

        # Token scoring: reward matches across title, brand, scent notes, and categories
        for t in tokens[:8]:
            when_conditions.append(When(title__icontains=t, then=Value(15.0)))
            when_conditions.append(When(attributes__brand__icontains=t, then=Value(10.0)))
            when_conditions.append(When(attributes__top_notes__icontains=t, then=Value(6.0)))
            when_conditions.append(When(attributes__middle_notes__icontains=t, then=Value(6.0)))
            when_conditions.append(When(attributes__base_notes__icontains=t, then=Value(6.0)))
            when_conditions.append(When(attributes__category__icontains=t, then=Value(4.0)))
            when_conditions.append(When(attributes__tags__icontains=t, then=Value(4.0)))

        # Build base filter
        filter_q = (
            Q(title__icontains=clean) |
            Q(attributes__brand__icontains=clean) |
            Q(sku__icontains=clean) |
            Q(barcode__icontains=clean) |
            Q(attributes__category__icontains=clean)
        )

        for t in tokens:
            filter_q |= (
                Q(title__icontains=t) |
                Q(attributes__brand__icontains=t) |
                Q(attributes__top_notes__icontains=t) |
                Q(attributes__middle_notes__icontains=t) |
                Q(attributes__base_notes__icontains=t)
            )

        if is_postgres:
            try:
                from django.contrib.postgres.search import TrigramSimilarity, TrigramWordSimilarity

                # Fuzzy trigram similarity annotations for title and brand
                queryset = queryset.annotate(
                    title_w_sim=TrigramWordSimilarity(clean, 'title'),
                    title_sim=TrigramSimilarity('title', clean),
                )

                relevance_expr = (
                    Case(*when_conditions, default=Value(0.0), output_field=FloatField())
                    + (F('title_w_sim') * 60.0)
                    + (F('title_sim') * 30.0)
                )

                # Include fuzzy matches (typos like 'haramein', 'oudh', 'vanila')
                fuzzy_q = filter_q | Q(title_w_sim__gte=0.32) | Q(title_sim__gte=0.25)
                return queryset.annotate(relevance_score=relevance_expr).filter(fuzzy_q).order_by('-relevance_score', 'title')
            except Exception as e:
                logger.warning(f"pg_trgm search fallback due to: {e}")

        # Fallback for SQLite / non-postgres environments
        relevance_expr = Case(*when_conditions, default=Value(0.0), output_field=FloatField())
        return queryset.annotate(relevance_score=relevance_expr).filter(filter_q).order_by('-relevance_score', 'title')

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
        import hashlib
        q_hash = hashlib.md5((search_query or '').strip().encode('utf-8')).hexdigest()
        cache_key = (
            f'catalog:products:page:{page}:size:{page_size}:q:{q_hash}:'
            f'stock:{stock_status}:brand:{brand}:status:{status_filter}:paginated:{paginate}'
        )
        cached = cache.get(cache_key)
        if cached:
            return cached

        products = (
            Product.objects
            .select_related('created_by', 'updated_by')
            .prefetch_related('images', 'variants', 'created_by__roles__role', 'updated_by__roles__role')
        )

        if not is_merchant:
            products = products.filter(is_online=True)
        else:
            if status_filter == 'online':
                products = products.filter(is_online=True)
            elif status_filter == 'offline':
                products = products.filter(is_online=False)

        if search_query:
            products = cls.apply_search_query(products, search_query)
        else:
            products = products.order_by('title')

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
        barcode = data.get('barcode') or attributes.get('barcode', '')
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

        main_image = files.get('image')
        gallery_images = files.getlist('gallery') if hasattr(files, 'getlist') else []
        for img in gallery_images:
            validate_image_upload(img)

        # First image is main image; remaining are featured gallery images
        if not main_image and gallery_images:
            main_image = gallery_images[0]
            gallery_images = gallery_images[1:]

        product = Product.objects.create(
            title=title,
            slug=slug,
            sku=sku,
            barcode=barcode,
            price=price,
            compare_at_price=compare_at_price if compare_at_price else None,
            description=description,
            is_online=is_online,
            attributes=attributes,
            image=main_image,
            created_by=user,
            updated_by=user
        )

        brand_name = attributes.get('brand') or attributes.get('vendor')
        if brand_name:
            BrandService.save_brand(brand_name)

        stock_level = int(data.get('stock_level', 0))
        Inventory.objects.create(product=product, stock_level=stock_level)

        if product.image:
            ProductImage.objects.create(product=product, image=product.image, position=1, is_primary=True)

        for pos, img in enumerate(gallery_images, start=2):
            ProductImage.objects.create(product=product, image=img, position=pos, is_primary=False)

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
                var_image_val = None
                if v_data.get('image') and isinstance(v_data.get('image'), str):
                    img_str = v_data.get('image').strip()
                    if '/media/' in img_str:
                        var_image_val = img_str.split('/media/')[-1]
                    elif '/variants/' in img_str:
                        var_image_val = 'variants/' + img_str.split('/variants/')[-1]
                    elif '/products/' in img_str:
                        var_image_val = 'products/' + img_str.split('/products/')[-1]
                    elif not img_str.startswith('http'):
                        var_image_val = img_str

                ProductVariant.objects.create(
                    product=product,
                    title=v_data.get('title', 'Default Title'),
                    option1_name=v_data.get('option1_name', 'Size'),
                    option1_value=v_data.get('option1_value', '100ml'),
                    option2_name=v_data.get('option2_name', ''),
                    option2_value=v_data.get('option2_value', ''),
                    sku=v_data.get('sku') or f"{product.sku}-{v_data.get('option1_value', '1')}",
                    barcode=v_data.get('barcode', ''),
                    price=Decimal(str(v_data.get('price') or product.price)),
                    compare_at_price=Decimal(str(v_data.get('compare_at_price'))) if v_data.get('compare_at_price') else None,
                    cost_price=Decimal(str(v_data.get('cost_price'))) if v_data.get('cost_price') else None,
                    stock_level=int(v_data.get('stock') or 0),
                    weight=str(v_data.get('weight', '')),
                    dimensions=str(v_data.get('dimensions', '')),
                    is_default=bool(v_data.get('is_default', False)),
                    is_active=bool(v_data.get('is_active', True)) if 'is_active' in v_data else True,
                    image=var_image_val,
                )

        # Manual Collections Sync
        manual_collections = attributes.get('collections', []) if isinstance(attributes, dict) else []
        if isinstance(manual_collections, list):
            for col_name in manual_collections:
                if isinstance(col_name, str) and col_name.strip():
                    c_title = col_name.strip()
                    c_slug = c_title.lower().replace(" ", "-")
                    if c_title.lower() in ['new', 'new launch', 'new launches', 'new arrival', 'new arrivals']:
                        c_slug = 'new'
                    col, _ = Collection.objects.get_or_create(
                        slug=c_slug,
                        defaults={'title': c_title, 'match_type': 'manual', 'is_active': True}
                    )
                    col.products.add(product)

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

        product.title = data.get('title', product.title)
        product.sku = data.get('sku', product.sku)
        if 'barcode' in data:
            product.barcode = data.get('barcode', '')
        elif attributes and 'barcode' in attributes:
            product.barcode = attributes.get('barcode', '')

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

        # First image is main image; remaining are featured gallery images
        if not product.image and gallery_images:
            product.image = gallery_images[0]
            gallery_images = gallery_images[1:]

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

        if 'image' in files and product.image:
            ProductImage.objects.filter(product=product, is_primary=True).update(is_primary=False)
            ProductImage.objects.create(product=product, image=product.image, position=1, is_primary=True)

        if gallery_images:
            current_max_pos = product.images.order_by('-position').values_list('position', flat=True).first() or 1
            for offset, img in enumerate(gallery_images, start=1):
                ProductImage.objects.create(product=product, image=img, position=current_max_pos + offset, is_primary=False)

        variants_json = data.get('variants')
        if variants_json is not None:
            if isinstance(variants_json, str):
                try:
                    variants_list = json.loads(variants_json)
                except Exception:
                    variants_list = []
            elif isinstance(variants_json, list):
                variants_list = variants_json
            else:
                variants_list = []

            existing_images_by_sku = {
                var.sku: var.image for var in product.variants.all() if var.image
            }
            existing_images_by_title = {
                var.title.strip().lower(): var.image for var in product.variants.all() if var.image
            }
            product.variants.all().delete()
            for v_data in variants_list:
                var_sku = v_data.get('sku') or f"{product.sku}-{v_data.get('option1_value', '1')}"
                var_title = v_data.get('title', 'Default Title')
                existing_img = existing_images_by_sku.get(var_sku) or existing_images_by_title.get(var_title.strip().lower())
                var_image_val = existing_img
                if v_data.get('image') and isinstance(v_data.get('image'), str):
                    img_str = v_data.get('image').strip()
                    if '/media/' in img_str:
                        var_image_val = img_str.split('/media/')[-1]
                    elif '/variants/' in img_str:
                        var_image_val = 'variants/' + img_str.split('/variants/')[-1]
                    elif '/products/' in img_str:
                        var_image_val = 'products/' + img_str.split('/products/')[-1]
                    elif not var_image_val and not img_str.startswith('http'):
                        var_image_val = img_str

                ProductVariant.objects.create(
                    product=product,
                    title=var_title,
                    option1_name=v_data.get('option1_name', 'Size'),
                    option1_value=v_data.get('option1_value', '100ml'),
                    option2_name=v_data.get('option2_name', ''),
                    option2_value=v_data.get('option2_value', ''),
                    sku=var_sku,
                    barcode=v_data.get('barcode', ''),
                    price=Decimal(str(v_data.get('price') or product.price)),
                    compare_at_price=Decimal(str(v_data.get('compare_at_price'))) if v_data.get('compare_at_price') else None,
                    cost_price=Decimal(str(v_data.get('cost_price'))) if v_data.get('cost_price') else None,
                    stock_level=int(v_data.get('stock') or 0),
                    weight=str(v_data.get('weight', '')),
                    dimensions=str(v_data.get('dimensions', '')),
                    is_default=bool(v_data.get('is_default', False)),
                    is_active=bool(v_data.get('is_active', True)) if 'is_active' in v_data else True,
                    image=var_image_val,
                )

        # Manual Collections Sync
        if attributes and 'collections' in attributes:
            manual_collections = attributes.get('collections', [])
            if isinstance(manual_collections, list):
                active_col_slugs = set()
                for col_name in manual_collections:
                    if isinstance(col_name, str) and col_name.strip():
                        c_title = col_name.strip()
                        c_slug = c_title.lower().replace(" ", "-")
                        if c_title.lower() in ['new', 'new launch', 'new launches', 'new arrival', 'new arrivals']:
                            c_slug = 'new'
                        active_col_slugs.add(c_slug)
                        col, _ = Collection.objects.get_or_create(
                            slug=c_slug,
                            defaults={'title': c_title, 'match_type': 'manual', 'is_active': True}
                        )
                        col.products.add(product)
                # Detach product from manual collections that were unassigned
                for old_col in Collection.objects.filter(match_type='manual', products=product):
                    if old_col.slug not in active_col_slugs:
                        old_col.products.remove(product)

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

        add_to_collection = patch_data.get('add_to_collection')
        if add_to_collection and isinstance(add_to_collection, str) and add_to_collection.strip():
            c_title = add_to_collection.strip()
            c_slug = c_title.lower().replace(" ", "-")
            if c_title.lower() in ['new', 'new launch', 'new launches', 'new arrival', 'new arrivals']:
                c_slug = 'new'
            col, _ = Collection.objects.get_or_create(
                slug=c_slug,
                defaults={'title': c_title, 'match_type': 'manual', 'is_active': True}
            )
            products = Product.objects.filter(slug__in=slugs)
            count = 0
            for p in products:
                col.products.add(p)
                p_attrs = p.attributes or {}
                cols = p_attrs.get('collections', [])
                if not isinstance(cols, list):
                    cols = []
                if c_title not in cols:
                    cols.append(c_title)
                    p_attrs['collections'] = cols
                    p.attributes = p_attrs
                    p.save(update_fields=['attributes'])
                count += 1
            cache.clear()
            if user and request:
                log_action(user, f"Bulk added {count} products to collection '{c_title}'", request)
            return True, f"Successfully added {count} products to collection '{c_title}'.", count

        return False, "No valid action provided.", 0
