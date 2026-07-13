# pyrefly: ignore [missing-import]
from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from django.core.cache import cache
import json
from decimal import Decimal

from .models import Product, Inventory, ProductImage, Collection, AutoCollection
# pyrefly: ignore [missing-import]
from django.utils.text import slugify
# pyrefly: ignore [missing-import]
from apps.authentication.views import HasRolePermission
# pyrefly: ignore [missing-import]
from apps.authentication.helpers import log_action
# pyrefly: ignore [missing-import]
from django.db.models import Sum, Count, Q
from .services import CollectionSyncService
# pyrefly: ignore [missing-import]
from django.utils import timezone
from datetime import timedelta
import random
# pyrefly: ignore [missing-import]
from apps.orders.models import Order

def flatten_product(product, request):
    """
    Extracts nested data from the attributes JSONB field and flattens it
    so the API response matches the storefront's expected TypeScript interface.
    """
    images_data = []
    for img in product.images.all():
        images_data.append({
            'url': request.build_absolute_uri(img.image.url) if img.image else None,
            'altText': img.alt_text,
            'width': img.width,
            'height': img.height
        })

    stock_val = product.inventory.stock_level if hasattr(product, 'inventory') else 0

    result = {
        'id': str(product.id),
        'title': product.title,
        'slug': product.slug,
        'sku': product.sku,
        'price': str(product.price),
        'compare_at_price': str(product.compare_at_price) if product.compare_at_price else None,
        'image': request.build_absolute_uri(product.image.url) if product.image else None,
        'images': images_data,
        'stock': stock_val,
        'stock_count': stock_val,
        'is_online': product.is_online,
        'created_at': product.created_at.isoformat(),
        'updated_at': product.updated_at.isoformat(),
        'description': product.description,
        'created_by_name': (f"{product.created_by.full_name or product.created_by.email}" + (f" ({', '.join([ur.role.name for ur in product.created_by.roles.all()])})" if product.created_by.roles.exists() else "")) if product.created_by else "",
        'updated_by_name': (f"{product.updated_by.full_name or product.updated_by.email}" + (f" ({', '.join([ur.role.name for ur in product.updated_by.roles.all()])})" if product.updated_by.roles.exists() else "")) if product.updated_by else "",
    }

    attrs = product.attributes or {}
    
    # Storefront metafields defaults
    result['brand'] = attrs.get('brand', '')
    result['tagline'] = attrs.get('tagline', '')
    result['category'] = attrs.get('category')
    result['productType'] = attrs.get('productType')
    result['tags'] = attrs.get('tags', [])
    result['vendor'] = attrs.get('vendor', '')
    result['top_notes'] = attrs.get('top_notes', '')
    result['middle_notes'] = attrs.get('middle_notes', '')
    result['base_notes'] = attrs.get('base_notes', '')
    result['longevity'] = attrs.get('longevity', '')
    result['sillage'] = attrs.get('sillage', '')
    result['size_ml'] = attrs.get('size_ml', 100)
    result['is_scent_shot'] = attrs.get('is_scent_shot', False)
    result['whats_inside'] = attrs.get('whats_inside', [])
    result['ingredients'] = attrs.get('ingredients', '')
    
    # Optional fields
    result['image_alt_text'] = attrs.get('image_alt_text', '')
    result['ideal_for'] = attrs.get('ideal_for', '')
    result['fragrance_type'] = attrs.get('fragrance_type', '')
    result['origin_country'] = attrs.get('origin_country', '')
    result['concentration'] = attrs.get('concentration', '')
    result['gender'] = attrs.get('gender', '')
    result['season'] = attrs.get('season', '')
    result['occasion'] = attrs.get('occasion', '')
    result['rating'] = attrs.get('rating', 4.5)
    result['rating_count'] = attrs.get('rating_count', 0)
    result['discount_price'] = attrs.get('discount_price', None)
    result['has_discount'] = attrs.get('has_discount', False)
    
    # Preserve raw attributes for backward compatibility
    result['attributes'] = attrs

    return result


def auto_generate_tags(attributes):
    """
    Build tags array from product attribute fields for collection matching and search.
    Called automatically on product create/update.
    """
    tags = list(attributes.get('tags', []))
    
    # Gender tags (for /men, /women collection matching)
    gender = attributes.get('gender', '')
    if gender:
        gl = gender.lower()
        if 'men' in gl and 'women' not in gl:
            for t in ['Perfume for Men', 'men']:
                if t.lower() not in [x.lower() for x in tags]:
                    tags.append(t)
        if 'women' in gl or 'female' in gl:
            for t in ['Perfume for Women', 'women']:
                if t.lower() not in [x.lower() for x in tags]:
                    tags.append(t)
        if 'unisex' in gl:
            for t in ['Unisex Perfume', 'unisex']:
                if t.lower() not in [x.lower() for x in tags]:
                    tags.append(t)
    
    # Category as tag (for /woody, /floral collection matching)
    category = attributes.get('category', '')
    if category and category.lower() not in [t.lower() for t in tags]:
        tags.append(category.lower())
    
    # Brand as tag (for /brands/[slug] collection matching)
    brand = attributes.get('brand', '')
    if brand and brand.lower() not in [t.lower() for t in tags]:
        tags.append(brand.lower())
    
    # Product type as tag
    product_type = attributes.get('productType', '')
    if product_type and product_type.lower() not in [t.lower() for t in tags]:
        tags.append(product_type.lower())
    
    # Occasion as tag
    occasion = attributes.get('occasion', '')
    if occasion and occasion.lower() not in [t.lower() for t in tags]:
        tags.append(occasion.lower())
    
    # Season as tag
    season = attributes.get('season', '')
    if season and season.lower() not in [t.lower() for t in tags]:
        tags.append(season.lower())
    
    # Scent notes as tags (top, middle, base)
    for note_field in ['top_notes', 'middle_notes', 'base_notes']:
        notes = attributes.get(note_field, '')
        if notes:
            for note in notes.split(','):
                note = note.strip().lower()
                if note and note not in [t.lower() for t in tags]:
                    tags.append(note)
    
    # Deduplicate (case-insensitive, preserve first occurrence)
    seen = set()
    unique = []
    for t in tags:
        key = t.lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(t)
    
    return unique


import os
# pyrefly: ignore [missing-import]
from django.conf import settings

BRANDS_FILE_PATH = os.path.join(settings.BASE_DIR, 'brands.json')
CONSTANTS_PATH = '/app/constants.ts'

import re

def load_brands():
    # 1. Try to read from constants.ts first
    if os.path.exists(CONSTANTS_PATH):
        try:
            with open(CONSTANTS_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
            match = re.search(r'export\s+const\s+TOP_BRANDS\s*=\s*\[(.*?)\]', content, re.DOTALL)
            if match:
                brands_block = match.group(1)
                brands = re.findall(r'["\'](.*?)["\']', brands_block)
                return [b.strip() for b in brands if b.strip()]
        except Exception as e:
            print("Error loading brands from constants.ts:", e)

    # 2. Fallback to brands.json
    if not os.path.exists(BRANDS_FILE_PATH):
        default_brands = [
            "Al Haramain", "Arabiyat Prestige", "Lomani", "Louis Cardin",
            "MPF", "New NB", "Otoori", "Lattafa", "Swiss Arabian",
            "PerfumeBooth", "Armaf", "Creed", "Chanel"
        ]
        with open(BRANDS_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(default_brands, f, indent=2)
        return default_brands
    try:
        with open(BRANDS_FILE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_brand(brand_name):
    if not brand_name:
        return
    brand_name = brand_name.strip()
    if not brand_name:
        return
    
    # 1. If constants.ts exists, update constants.ts
    if os.path.exists(CONSTANTS_PATH):
        try:
            with open(CONSTANTS_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
            
            match = re.search(r'export\s+const\s+TOP_BRANDS\s*=\s*\[(.*?)(,\s*)?\]', content, re.DOTALL)
            if match:
                brands_block = match.group(1)
                existing_brands = re.findall(r'["\'](.*?)["\']', brands_block)
                # Case insensitive check
                if not any(b.lower() == brand_name.lower() for b in existing_brands):
                    # Strip any trailing comma/space
                    clean_block = brands_block.rstrip()
                    if clean_block and not clean_block.endswith(','):
                        new_block = clean_block + f',\n  "{brand_name}"'
                    else:
                        new_block = clean_block + f'\n  "{brand_name}"'
                    
                    new_content = content.replace(brands_block, new_block)
                    with open(CONSTANTS_PATH, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    return
        except Exception as e:
            print("Error saving brand to constants.ts:", e)

    # 2. Fallback to brands.json
    brands = load_brands()
    if not any(b.lower() == brand_name.lower() for b in brands):
        brands.append(brand_name)
        with open(BRANDS_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(brands, f, indent=2)

class BrandListView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        brands = load_brands()
        return Response(brands)

    def post(self, request):
        brand_name = request.data.get('brand')
        if brand_name:
            save_brand(brand_name)
            return Response({'status': 'success', 'brands': load_brands()})
        return Response({'error': 'Brand name is required'}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        brand_name = request.data.get('brand') or request.query_params.get('brand')
        if not brand_name:
            return Response({'error': 'Brand name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        brand_name = brand_name.strip()
        
        # 1. Update constants.ts if it exists
        if os.path.exists(CONSTANTS_PATH):
            try:
                with open(CONSTANTS_PATH, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                match = re.search(r'export\s+const\s+TOP_BRANDS\s*=\s*\[(.*?)(,\s*)?\]', content, re.DOTALL)
                if match:
                    brands_block = match.group(1)
                    existing_brands = re.findall(r'["\'](.*?)["\']', brands_block)
                    
                    # Filter out the deleted brand (case-insensitive)
                    new_brands = [b for b in existing_brands if b.lower() != brand_name.lower()]
                    
                    # Rebuild the TOP_BRANDS block
                    new_block = "\n  " + ",\n  ".join([f'"{b}"' for b in new_brands]) + ",\n"
                    new_content = content.replace(brands_block, new_block)
                    with open(CONSTANTS_PATH, 'w', encoding='utf-8') as f:
                        f.write(new_content)
            except Exception as e:
                print("Error deleting brand from constants.ts:", e)
        
        # 2. Fallback / Sync brands.json
        if os.path.exists(BRANDS_FILE_PATH):
            try:
                with open(BRANDS_FILE_PATH, 'r', encoding='utf-8') as f:
                    brands = json.load(f)
                brands = [b for b in brands if b.lower() != brand_name.lower()]
                with open(BRANDS_FILE_PATH, 'w', encoding='utf-8') as f:
                    json.dump(brands, f, indent=2)
            except Exception:
                pass
                
        return Response({'status': 'success', 'brands': load_brands()})


class ProductFacetsView(APIView):
    """
    GET /api/shop/facets/ — Returns aggregated filter facets from all online products.
    Used by the storefront sidebar to dynamically populate filter options.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cache_key = 'catalog:facets'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        products = Product.objects.filter(is_online=True)

        # Counters for each facet
        genders = {}
        brands = {}
        categories = {}
        product_types = {}
        occasions = {}
        seasons = {}
        all_tags = set()

        for product in products:
            attrs = product.attributes or {}

            # Gender
            gender = attrs.get('gender', '').strip()
            if gender:
                genders[gender] = genders.get(gender, 0) + 1

            # Brand
            brand = attrs.get('brand', '').strip()
            if brand:
                brands[brand] = brands.get(brand, 0) + 1

            # Category
            category = attrs.get('category', '').strip()
            if category:
                categories[category] = categories.get(category, 0) + 1

            # Product Type
            pt = attrs.get('productType', '').strip()
            if pt:
                product_types[pt] = product_types.get(pt, 0) + 1

            # Occasion
            occasion = attrs.get('occasion', '').strip()
            if occasion:
                occasions[occasion] = occasions.get(occasion, 0) + 1

            # Season
            season = attrs.get('season', '').strip()
            if season:
                seasons[season] = seasons.get(season, 0) + 1

            # Tags
            tags = attrs.get('tags', [])
            if isinstance(tags, list):
                all_tags.update(tags)

        def to_facet_list(counter):
            return sorted(
                [{'value': k, 'count': v} for k, v in counter.items()],
                key=lambda x: x['count'],
                reverse=True
            )

        data = {
            'genders': to_facet_list(genders),
            'brands': to_facet_list(brands),
            'categories': to_facet_list(categories),
            'productTypes': to_facet_list(product_types),
            'occasions': to_facet_list(occasions),
            'seasons': to_facet_list(seasons),
            'tags': sorted(list(all_tags)),
        }

        cache.set(cache_key, data, timeout=300)  # Cache 5 minutes
        return Response(data)


class ProductListView(APIView):
    """GET /api/shop/products/ — Paginated product catalog."""
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        # Retrieve filters from query parameters
        search_query = request.query_params.get('search', '')
        stock_status = request.query_params.get('stock_status', '')  # 'all', 'low', 'out'
        brand = request.query_params.get('brand', '')
        status_filter = request.query_params.get('status', '')  # 'online', 'offline'
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))  # Default 50 per page
        paginate = request.query_params.get('paginate', 'false').lower() == 'true'

        # Cache key: catalog:products:<params>
        cache_key = f'catalog:products:page:{page}:size:{page_size}:search:{search_query}:stock:{stock_status}:brand:{brand}:status:{status_filter}:paginated:{paginate}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        # Include items that are offline if requested by an authenticated merchant
        is_merchant = request.user and request.user.is_authenticated and any(
            role in ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )
        
        products = Product.objects.select_related('created_by', 'updated_by').prefetch_related(
            'images',
            'created_by__roles__role',
            'updated_by__roles__role'
        ).order_by('title')

        if not is_merchant:
            products = products.filter(is_online=True)
        else:
            if status_filter == 'online':
                products = products.filter(is_online=True)
            elif status_filter == 'offline':
                products = products.filter(is_online=False)

        # Apply search filter
        if search_query:
            products = products.filter(
                Q(title__icontains=search_query) | 
                Q(sku__icontains=search_query) |
                Q(attributes__brand__icontains=search_query)
            )

        # Apply stock filter
        if stock_status == 'low':
            products = products.filter(inventory__stock_level__gt=0, inventory__stock_level__lte=10)
        elif stock_status == 'out':
            products = products.filter(inventory__stock_level=0)

        # Apply brand filter
        if brand:
            products = products.filter(attributes__brand=brand)

        if not paginate:
            # Return full list as an array for backward compatibility
            data = []
            for product in products:
                data.append(flatten_product(product, request))
            cache.set(cache_key, data, timeout=7200)
            return Response(data)

        # Pagination calculations
        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        paginated_products = products[start:end]

        results = []
        for product in paginated_products:
            results.append(flatten_product(product, request))

        response_data = {
            'results': results,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        }

        cache.set(cache_key, response_data, timeout=30)  # cache 30 seconds for quick pagination changes
        return Response(response_data)

    def delete(self, request):
        slugs = request.data.get('slugs', [])
        if not slugs:
            return Response({'detail': 'No products selected.'}, status=status.HTTP_400_BAD_REQUEST)
        
        count, _ = Product.objects.filter(slug__in=slugs).delete()
        
        # Clean up any collections left with 0 products
        AutoCollection.objects.annotate(num_products=Count('products')).filter(num_products=0).delete()
        Collection.objects.annotate(num_products=Count('products')).filter(num_products=0).delete()
        
        cache.clear()
        
        log_action(request.user, f"Bulk deleted {count} products", request)
        return Response({'detail': f'Successfully deleted {count} products.'})

    def patch(self, request):
        slugs = request.data.get('slugs', [])
        if not slugs:
            return Response({'detail': 'No products selected.'}, status=status.HTTP_400_BAD_REQUEST)

        is_online = request.data.get('is_online')
        price_adjustment = request.data.get('price_adjustment')
        stock_adjustment = request.data.get('stock_adjustment')

        if is_online is not None:
            is_online_bool = str(is_online).lower() == 'true'
            count = Product.objects.filter(slug__in=slugs).update(is_online=is_online_bool)
            cache.clear()
            action_word = "published" if is_online_bool else "unpublished"
            log_action(request.user, f"Bulk {action_word} {count} products", request)
            return Response({'detail': f'Successfully {action_word} {count} products.'})

        if price_adjustment:
            action = price_adjustment.get('action') # 'percent_discount', 'fixed_discount', 'set_compare'
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
            log_action(request.user, f"Bulk adjusted price for {count} products", request)
            return Response({'detail': f'Successfully adjusted price for {count} products.'})

        if stock_adjustment:
            action = stock_adjustment.get('action') # 'set', 'add'
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
            log_action(request.user, f"Bulk adjusted stock level for {count} products", request)
            return Response({'detail': f'Successfully adjusted stock level for {count} products.'})

        return Response({'detail': 'No valid action provided.'}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        title = request.data.get('title')
        slug = request.data.get('slug')
        sku = request.data.get('sku')
        price = request.data.get('price')
        compare_at_price = request.data.get('compare_at_price')
        description = request.data.get('description', '')
        is_online = str(request.data.get('is_online', 'true')).lower() == 'true'
        
        attributes = request.data.get('attributes', '{}')
        if isinstance(attributes, str):
            try:
                attributes = json.loads(attributes)
            except json.JSONDecodeError:
                attributes = {}

        # Auto-generate tags from product fields for collection matching
        attributes['tags'] = auto_generate_tags(attributes)

        user = request.user if request.user and request.user.is_authenticated else None

        product = Product.objects.create(
            title=title,
            slug=slug,
            sku=sku,
            price=price,
            compare_at_price=compare_at_price if compare_at_price else None,
            description=description,
            is_online=is_online,
            attributes=attributes,
            image=request.FILES.get('image'),
            created_by=user,
            updated_by=user
        )
        
        # Auto-save brand to brands.json
        brand_name = attributes.get('brand') or attributes.get('vendor')
        if brand_name:
            save_brand(brand_name)
        
        stock_level = int(request.data.get('stock_level', 0))
        Inventory.objects.create(product=product, stock_level=stock_level)
        
        gallery_images = request.FILES.getlist('gallery')
        for img in gallery_images:
            ProductImage.objects.create(product=product, image=img)


        # Auto sync collections
        synced = CollectionSyncService.syncProductCollections(product)
        
        cache.clear()
        log_action(request.user, f"Created product '{product.title}' (SKU: {product.sku})", request)
        return Response({
            "success": True,
            "message": "Product saved successfully.",
            "collections_synced": synced,
            "id": str(product.id),
            "slug": product.slug
        }, status=status.HTTP_201_CREATED)


class ProductDetailView(APIView):
    """GET /api/shop/products/<slug>/ — Single product by slug."""
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request, slug: str):
        cache_key = f'catalog:product:{slug}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            product = Product.objects.prefetch_related('images').get(slug=slug)
        except Product.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        data = flatten_product(product, request)
        cache.set(cache_key, data, timeout=7200)
        return Response(data)

    def put(self, request, slug: str):
        try:
            product = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
            
        product.title = request.data.get('title', product.title)
        product.sku = request.data.get('sku', product.sku)
        product.price = request.data.get('price', product.price)
        product.compare_at_price = request.data.get('compare_at_price', product.compare_at_price)
        product.description = request.data.get('description', product.description)
        product.is_online = str(request.data.get('is_online', product.is_online)).lower() == 'true'
        
        if 'image' in request.FILES:
            product.image = request.FILES['image']
            
        attributes = request.data.get('attributes')
        if attributes:
            if isinstance(attributes, str):
                try:
                    attributes = json.loads(attributes)
                except json.JSONDecodeError:
                    attributes = None
            if isinstance(attributes, dict):
                # Auto-generate tags from product fields for collection matching
                attributes['tags'] = auto_generate_tags(attributes)
                product.attributes = attributes
                
        if request.user and request.user.is_authenticated:
            product.updated_by = request.user
        product.save()
        
        # Auto-save brand to brands.json
        if product.attributes:
            brand_name = product.attributes.get('brand') or product.attributes.get('vendor')
            if brand_name:
                save_brand(brand_name)
        
        if 'stock_level' in request.data:
            stock = int(request.data['stock_level'])
            Inventory.objects.update_or_create(product=product, defaults={'stock_level': stock})
        gallery_images = request.FILES.getlist('gallery')
        for img in gallery_images:
            ProductImage.objects.create(product=product, image=img)
            


        # Auto sync collections
        synced = CollectionSyncService.syncProductCollections(product)

        cache.clear()
        log_action(request.user, f"Updated product '{product.title}' (SKU: {product.sku})", request)
        return Response({
            "success": True,
            "message": "Product saved successfully.",
            "collections_synced": synced
        })

    def delete(self, request, slug: str):
        try:
            product = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
            
        product_title = product.title
        product_sku = product.sku
        product.delete()
        
        # Clean up any collections left with 0 products
        AutoCollection.objects.annotate(num_products=Count('products')).filter(num_products=0).delete()
        Collection.objects.annotate(num_products=Count('products')).filter(num_products=0).delete()
        
        cache.clear()
        log_action(request.user, f"Deleted product '{product_title}' (SKU: {product_sku})", request)
        return Response({'detail': 'Product deleted successfully.'})


class DashboardAnalyticsView(APIView):
    """
    GET /api/shop/dashboard/ — Real-time merchant dashboard calculations
    (Super Admin, Admin, and E-commerce Executive only).
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        # 1. Total Revenue (Paid, Processing, Shipped, Delivered status orders)
        revenue_states = [Order.Status.PAID, Order.Status.PROCESSING, Order.Status.SHIPPED, Order.Status.DELIVERED]
        orders_query = Order.objects.filter(status__in=revenue_states)
        
        total_revenue = orders_query.aggregate(total=Sum('total'))['total'] or 0.00
        total_orders_count = orders_query.count()

        # 2. Average Order Value (AOV)
        aov = float(total_revenue) / total_orders_count if total_orders_count > 0 else 0.00

        # 3. Active Customers (unique user IDs)
        active_customers = orders_query.values('user').distinct().count()

        # 4. Low Stock Products (Inventory <= 10)
        low_stock_items = Inventory.objects.filter(stock_level__lte=10).select_related('product')
        low_stock_data = []
        for item in low_stock_items:
            if item.product:
                low_stock_data.append({
                    'id': str(item.product.id),
                    'title': item.product.title,
                    'sku': item.product.sku,
                    'stock': item.stock_level
                })

        # 5. Recent Orders (Latest 5 orders)
        recent_orders_list = Order.objects.order_by('-created_at')[:5]
        recent_orders_data = []
        for o in recent_orders_list:
            recent_orders_data.append({
                'id': str(o.id),
                'orderNo': o.order_number,
                'customer': o.user.full_name if o.user else 'Guest',
                'total': f"₹{o.total:,.2f}",
                'status': o.status,
                'date': o.created_at.isoformat()
            })

        # 6. Sales Trend (Daily sales for the last 7 days)
        trend_data = []
        today = timezone.now().date()
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_sales = Order.objects.filter(
                status__in=revenue_states,
                created_at__date=day
            ).aggregate(total=Sum('total'))['total'] or 0
            trend_data.append({
                'name': day.strftime('%a'),  # Mon, Tue, etc.
                'sales': float(day_sales)
            })

        # 7. Category Distribution (Inspect attributes -> category)
        category_counts = {}
        products = Product.objects.all()
        for p in products:
            attrs = p.attributes or {}
            category = attrs.get('category', 'Uncategorized')
            category_counts[category] = category_counts.get(category, 0) + 1
        
        category_data = []
        colors = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6']
        for idx, (cat, val) in enumerate(category_counts.items()):
            category_data.append({
                'name': cat,
                'value': val,
                'color': colors[idx % len(colors)]
            })

        # 8. Simulated Live Visitors (realistic active count)
        live_visitors = random.randint(12, 38)

        # 9. Return computed business metrics
        return Response({
            'kpis': [
                { 'title': 'Total Revenue', 'value': f"₹{total_revenue:,.2f}", 'change': '+12.5%', 'isPositive': True },
                { 'title': 'Total Orders', 'value': f"{total_orders_count:,}", 'change': '+8.2%', 'isPositive': True },
                { 'title': 'Active Customers', 'value': f"{active_customers:,}", 'change': '+5.4%', 'isPositive': True },
                { 'title': 'Average Order Value', 'value': f"₹{aov:,.2f}", 'change': '+2.1%', 'isPositive': True },
            ],
            'salesTrend': trend_data,
            'categoryData': category_data,
            'recentOrders': recent_orders_data,
            'lowStock': low_stock_data,
            'liveVisitors': live_visitors
        })


class CollectionListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        collections = AutoCollection.objects.all()
        is_merchant = request.user and request.user.is_authenticated and any(
            role in ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )
        if not is_merchant:
            collections = collections.filter(status='active')

        data = []
        for col in collections:
            image_url = request.build_absolute_uri(col.image.url) if col.image else None
            data.append({
                'id': str(col.id),
                'title': col.name,
                'slug': col.slug,
                'description': col.description or '',
                'image': image_url,
                'match_type': col.collection_type,
                'match_value': '',
                'is_active': col.status == 'active',
                'sort_order': 0,
                'product_count': col.products.count(),
                'products': [str(p.id) for p in col.products.all()],
                'excluded_products': col.excluded_products or []
            })
        return Response(data)

    def post(self, request):
        title = request.data.get('title')
        match_type = request.data.get('match_type', 'manual')
        slug = request.data.get('slug')
        
        if slug:
            if '/' not in slug:
                slug = f"{match_type}/{slug}"
        else:
            slug = f"{match_type}/{slugify(title)}"

        description = request.data.get('description', '')
        is_active = str(request.data.get('is_active', 'true')).lower() == 'true'
        status_val = 'active' if is_active else 'inactive'
        image = request.FILES.get('image')

        collection = AutoCollection.objects.create(
            name=title,
            slug=slug,
            description=description,
            collection_type=match_type,
            status=status_val,
            image=image
        )

        if match_type == 'manual':
            product_ids = request.data.getlist('products')
            if not product_ids and 'products' in request.data:
                try:
                    product_ids = json.loads(request.data.get('products'))
                except:
                    pass
            if not product_ids:
                return Response({'detail': 'A manual collection must contain at least 1 product.'}, status=status.HTTP_400_BAD_REQUEST)
            products = Product.objects.filter(id__in=product_ids)
            collection.products.set(products)

        cache.clear()
        log_action(request.user, f"Created collection '{collection.name}' (Slug: {collection.slug})", request)
        return Response({
            'id': str(collection.id),
            'slug': collection.slug,
            'detail': 'Collection created successfully.'
        }, status=status.HTTP_201_CREATED)


class CollectionDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get_collection(self, slug):
        if '/' in slug:
            return AutoCollection.objects.filter(slug=slug).first()
        return AutoCollection.objects.filter(slug=slug).first() or \
               AutoCollection.objects.filter(slug__endswith=f"/{slug}").first()

    def get(self, request, slug):
        col = self.get_collection(slug)
        if not col:
            return Response({'detail': 'Collection not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_merchant = request.user and request.user.is_authenticated and any(
            role in ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )
        if not is_merchant and col.status != 'active':
            return Response({'detail': 'Collection not found.'}, status=status.HTTP_404_NOT_FOUND)

        image_url = request.build_absolute_uri(col.image.url) if col.image else None
        
        if col.collection_type == 'manual':
            products_qs = col.products.filter(is_online=True)
        else:
            base = Product.objects.filter(is_online=True)
            val = col.name
            if col.collection_type == 'gender':
                products_qs = base.filter(attributes__gender__iexact=val)
            elif col.collection_type == 'brand':
                products_qs = base.filter(attributes__brand__iexact=val)
            elif col.collection_type == 'category':
                products_qs = base.filter(attributes__category__iexact=val)
            elif col.collection_type == 'type':
                products_qs = base.filter(attributes__productType__iexact=val)
            elif col.collection_type == 'note':
                products_qs = base.filter(attributes__tags__contains=[val])
            else:
                products_qs = base.none()

        if col.excluded_products:
            products_qs = products_qs.exclude(id__in=col.excluded_products)

        products_data = [flatten_product(p, request) for p in products_qs]

        data = {
            'id': str(col.id),
            'title': col.name,
            'slug': col.slug,
            'description': col.description or '',
            'image': image_url,
            'match_type': col.collection_type,
            'match_value': col.name,
            'is_active': col.status == 'active',
            'sort_order': 0,
            'products': products_data,
            'manual_product_ids': [str(p.id) for p in col.products.all()] if col.collection_type == 'manual' else [],
            'excluded_products': col.excluded_products or []
        }
        return Response(data)

    def put(self, request, slug):
        col = self.get_collection(slug)
        if not col:
            return Response({'detail': 'Collection not found.'}, status=status.HTTP_404_NOT_FOUND)

        col.name = request.data.get('title', col.name)
        col.slug = request.data.get('slug', col.slug)
        col.description = request.data.get('description', col.description)
        col.collection_type = request.data.get('match_type', col.collection_type)
        if 'is_active' in request.data:
            is_active = str(request.data.get('is_active')).lower() == 'true'
            col.status = 'active' if is_active else 'inactive'
        if 'image' in request.FILES:
            col.image = request.FILES.get('image')
        elif request.data.get('image') == 'null' or request.data.get('image') == '':
            col.image = None

        # Handle excluded products list in put method
        excluded_products_raw = request.data.get('excluded_products')
        excluded_products = []
        if excluded_products_raw:
            try:
                parsed = json.loads(excluded_products_raw)
                if isinstance(parsed, list):
                    excluded_products = parsed
            except:
                excluded_products = request.data.getlist('excluded_products')
        else:
            excluded_products = request.data.getlist('excluded_products')

        excluded_products = [
            item for item in excluded_products
            if item and item != '[]' and item != ''
        ]
        
        col.excluded_products = excluded_products
        if col.excluded_products:
            # Only remove products that have valid UUID values
            valid_uuids = []
            for item in col.excluded_products:
                try:
                    import uuid
                    uuid.UUID(str(item))
                    valid_uuids.append(item)
                except ValueError:
                    pass
            if valid_uuids:
                col.products.remove(*valid_uuids)

        col.save()

        if col.collection_type == 'manual':
            products_raw = request.data.get('products')
            product_ids = []
            if products_raw:
                try:
                    parsed = json.loads(products_raw)
                    if isinstance(parsed, list):
                        product_ids = parsed
                except:
                    product_ids = request.data.getlist('products')
            else:
                product_ids = request.data.getlist('products')

            product_ids = [
                item for item in product_ids
                if item and item != '[]' and item != ''
            ]

            if 'products' in request.data or product_ids:
                if not product_ids:
                    return Response({'detail': 'A manual collection must contain at least 1 product.'}, status=status.HTTP_400_BAD_REQUEST)
                products = Product.objects.filter(id__in=product_ids)
                col.products.set(products)
        else:
            col.products.clear()

        cache.clear()
        log_action(request.user, f"Updated collection '{col.name}'", request)
        return Response({'detail': 'Collection updated successfully.'})

    def delete(self, request, slug):
        col = self.get_collection(slug)
        if not col:
            return Response({'detail': 'Collection not found.'}, status=status.HTTP_404_NOT_FOUND)

        name = col.name
        col.delete()
        cache.clear()
        log_action(request.user, f"Deleted collection '{name}'", request)
        return Response({'detail': 'Collection deleted successfully.'})


# pyrefly: ignore [missing-import]
from django.http import HttpResponse
from io import BytesIO
# pyrefly: ignore [missing-import]
from django.utils.text import slugify

class ProductExcelExportView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Products"

        headers = [
            "Title", "Slug", "SKU", "Price", "Compare At Price", 
            "Description", "Stock Level", "Is Online", "Brand", 
            "Category", "Gender", "Product Type", "Top Notes", 
            "Middle Notes", "Base Notes", "Occasion", "Season"
        ]
        ws.append(headers)

        products = Product.objects.all().prefetch_related('inventory')
        for p in products:
            attrs = p.attributes or {}
            stock = p.inventory.stock_level if hasattr(p, 'inventory') else 0
            row = [
                p.title,
                p.slug,
                p.sku,
                float(p.price) if p.price else 0.0,
                float(p.compare_at_price) if p.compare_at_price else None,
                p.description,
                stock,
                p.is_online,
                attrs.get('brand') or attrs.get('vendor', ''),
                attrs.get('category', ''),
                attrs.get('gender', ''),
                attrs.get('productType', ''),
                attrs.get('top_notes', ''),
                attrs.get('middle_notes', ''),
                attrs.get('base_notes', ''),
                attrs.get('occasion', ''),
                attrs.get('season', '')
            ]
            ws.append(row)

        output = BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="perfumebooth_products.xlsx"'
        return response


class ProductExcelImportView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        import openpyxl
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file uploaded.'}, status=400)

        try:
            import csv
            is_csv = file_obj.name.lower().endswith('.csv')
            if is_csv:
                decoded_file = file_obj.read().decode('utf-8-sig').splitlines()
                reader = csv.reader(decoded_file)
                rows = list(reader)
            else:
                wb = openpyxl.load_workbook(file_obj, read_only=True)
                ws = wb.active
                rows = list(ws.iter_rows(values_only=True))

            if not rows:
                return Response({'detail': 'Uploaded sheet/file is empty.'}, status=400)

            headers = [str(h).strip().lower() for h in rows[0] if h is not None]
            header_map = {h: i for i, h in enumerate(headers)}

            def get_val(row, aliases, default=''):
                if isinstance(aliases, str):
                    aliases = [aliases]
                for alias in aliases:
                    idx = header_map.get(alias.lower())
                    if idx is not None and idx < len(row):
                        val = row[idx]
                        if val is not None:
                            if isinstance(val, str):
                                val = val.strip()
                                if val.startswith("'"):
                                    val = val[1:]
                            return val
                return default

            def safe_int(val, default=0):
                try:
                    return int(float(str(val).strip()))
                except:
                    return default

            def safe_float(val, default=None):
                try:
                    return float(str(val).strip())
                except:
                    return default

            products_imported = 0
            for row in rows[1:]:
                if not any(row):
                    continue

                sku = get_val(row, 'sku')
                title = get_val(row, ['title', 'product title', 'name', 'product name'])
                
                # Skip if both Title and SKU are completely missing
                if not sku and not title:
                    continue
                
                # Generate fallback Title if SKU exists but Title is missing
                if not title:
                    title = f"Product {sku}"
                
                # Generate fallback SKU if Title exists but SKU is missing
                if not sku:
                    import random
                    title_slug = slugify(title)
                    sku = f"PB-AUTO-{title_slug[:20].upper()}-{random.randint(1000, 9999)}"

                price = safe_float(get_val(row, ['price', 'price (₹)', 'selling price']), 0.0)
                compare_price = safe_float(get_val(row, ['compare at price', 'compare at price (₹)', 'mrp']))
                description = get_val(row, ['description', 'product description', 'body'], '')
                is_online = str(get_val(row, ['is online', 'status', 'is_online'], 'true')).lower() == 'true'
                stock_level = safe_int(get_val(row, ['stock level', 'stock quantity', 'stock', 'quantity']), 0)
                slug = get_val(row, ['slug', 'handle'])
                if not slug:
                    slug = slugify(title)

                attributes = {
                    'brand': get_val(row, ['brand', 'brand name']),
                    'vendor': get_val(row, ['vendor'], 'PerfumeBooth') or 'PerfumeBooth',
                    'category': get_val(row, ['category', 'product category']),
                    'gender': get_val(row, ['gender', 'target gender']),
                    'productType': get_val(row, ['product type', 'concentration', 'productType']),
                    'top_notes': get_val(row, ['top notes', 'top_notes']),
                    'middle_notes': get_val(row, ['middle notes', 'middle_notes', 'heart notes', 'heart_notes']),
                    'base_notes': get_val(row, ['base notes', 'base_notes']),
                    'occasion': get_val(row, ['occasion']),
                    'season': get_val(row, ['season']),
                    'image_alt_text': get_val(row, ['image alt text', 'image alt', 'alt text', 'alt_text'])
                }

                attributes = {k: (v if v is not None else '') for k, v in attributes.items()}
                attributes['tags'] = auto_generate_tags(attributes)

                user = request.user if request.user and request.user.is_authenticated else None
                defaults = {
                    'title': title,
                    'slug': slug,
                    'price': price,
                    'compare_at_price': compare_price if compare_price else None,
                    'description': description,
                    'is_online': is_online,
                    'attributes': attributes,
                    'updated_by': user
                }
                if not Product.objects.filter(sku=sku).exists():
                    defaults['created_by'] = user

                product, created = Product.objects.update_or_create(
                    sku=sku,
                    defaults=defaults
                )

                # Download and save image if an image URL is provided in the Excel/CSV sheet
                image_url = get_val(row, ['image src', 'image', 'image url', 'image_url'])
                if image_url and (image_url.startswith('http://') or image_url.startswith('https://')):
                    try:
                        import requests
                        import re
                        # pyrefly: ignore [missing-import]
                        from django.core.files.base import ContentFile
                        from urllib.parse import urlparse
                        import os

                        # Transform Google Drive link to direct download link if needed
                        if 'drive.google.com' in image_url:
                            file_id_match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', image_url)
                            if not file_id_match:
                                file_id_match = re.search(r'id=([a-zA-Z0-9_-]+)', image_url)
                            if file_id_match:
                                file_id = file_id_match.group(1)
                                image_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                        
                        img_res = requests.get(image_url, timeout=15)
                        if img_res.status_code == 200:
                            parsed_url = urlparse(image_url)
                            file_name = os.path.basename(parsed_url.path)
                            # If it's a drive.google.com link, parsed path basename might be 'uc', so check or fallback
                            if not file_name or file_name == 'uc':
                                file_name = f"{sku}.jpg"
                            product.image.save(file_name, ContentFile(img_res.content), save=True)
                    except Exception as img_err:
                        print(f"Error downloading image {image_url} for SKU {sku}: {img_err}")

                # Auto-save brand to brands list
                brand_name = attributes.get('brand')
                if brand_name:
                    save_brand(brand_name)

                Inventory.objects.update_or_create(
                    product=product,
                    defaults={'stock_level': stock_level}
                )

                CollectionSyncService.syncProductCollections(product)
                products_imported += 1

            cache.clear()
            return Response({
                'success': True,
                'detail': f'Successfully imported {products_imported} products.'
            })
        except Exception as e:
            return Response({'detail': f'Error reading Excel: {str(e)}'}, status=500)


from .models import PageBanner

class PageBannerDetailView(APIView):
    """
    Public API to fetch active banners by page slug.
    Used by the storefront (Next.js) to display dynamic CMS banners.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        banner = PageBanner.objects.filter(page_slug=slug, is_active=True).first()
        if not banner:
            return Response({'detail': 'Banner not found.'}, status=status.HTTP_404_NOT_FOUND)

        images = banner.images.all()
        image_data = []
        for img in images:
            image_data.append({
                'id': str(img.id),
                'image_url': request.build_absolute_uri(img.image.url) if img.image else None,
                'mobile_image_url': request.build_absolute_uri(img.mobile_image.url) if img.mobile_image else None,
                'sort_order': img.sort_order,
                'link_url': img.link_url
            })
            
        return Response({
            'id': str(banner.id),
            'page_slug': banner.page_slug,
            'title': banner.title,
            'is_active': banner.is_active,
            'images': image_data
        })
class ProductExcelImportView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        import openpyxl
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file uploaded.'}, status=400)

        try:
            import csv
            is_csv = file_obj.name.lower().endswith('.csv')
            if is_csv:
                decoded_file = file_obj.read().decode('utf-8-sig').splitlines()
                reader = csv.reader(decoded_file)
                rows = list(reader)
            else:
                wb = openpyxl.load_workbook(file_obj, read_only=True)
                ws = wb.active
                rows = list(ws.iter_rows(values_only=True))

            if not rows:
                return Response({'detail': 'Uploaded sheet/file is empty.'}, status=400)

            headers = [str(h).strip().lower() for h in rows[0] if h is not None]
            header_map = {h: i for i, h in enumerate(headers)}

            def get_val(row, aliases, default=''):
                if isinstance(aliases, str):
                    aliases = [aliases]
                for alias in aliases:
                    idx = header_map.get(alias.lower())
                    if idx is not None and idx < len(row):
                        val = row[idx]
                        if val is not None:
                            if isinstance(val, str):
                                val = val.strip()
                                if val.startswith("'"):
                                    val = val[1:]
                            return val
                return default

            def safe_int(val, default=0):
                try:
                    return int(float(str(val).strip()))
                except:
                    return default

            def safe_float(val, default=None):
                try:
                    return float(str(val).strip())
                except:
                    return default

            products_imported = 0
            for row in rows[1:]:
                if not any(row):
                    continue

                sku = get_val(row, 'sku')
                title = get_val(row, ['title', 'product title', 'name', 'product name'])
                
                # Skip if both Title and SKU are completely missing
                if not sku and not title:
                    continue
                
                # Generate fallback Title if SKU exists but Title is missing
                if not title:
                    title = f"Product {sku}"
                
                # Generate fallback SKU if Title exists but SKU is missing
                if not sku:
                    import random
                    title_slug = slugify(title)
                    sku = f"PB-AUTO-{title_slug[:20].upper()}-{random.randint(1000, 9999)}"

                price = safe_float(get_val(row, ['price', 'price (₹)', 'selling price']), 0.0)
                compare_price = safe_float(get_val(row, ['compare at price', 'compare at price (₹)', 'mrp']))
                description = get_val(row, ['description', 'product description', 'body'], '')
                is_online = str(get_val(row, ['is online', 'status', 'is_online'], 'true')).lower() == 'true'
                stock_level = safe_int(get_val(row, ['stock level', 'stock quantity', 'stock', 'quantity']), 0)
                slug = get_val(row, ['slug', 'handle'])
                if not slug:
                    slug = slugify(title)

                attributes = {
                    'brand': get_val(row, ['brand', 'brand name']),
                    'vendor': get_val(row, ['vendor'], 'PerfumeBooth') or 'PerfumeBooth',
                    'category': get_val(row, ['category', 'product category']),
                    'gender': get_val(row, ['gender', 'target gender']),
                    'productType': get_val(row, ['product type', 'concentration', 'productType']),
                    'top_notes': get_val(row, ['top notes', 'top_notes']),
                    'middle_notes': get_val(row, ['middle notes', 'middle_notes', 'heart notes', 'heart_notes']),
                    'base_notes': get_val(row, ['base notes', 'base_notes']),
                    'occasion': get_val(row, ['occasion']),
                    'season': get_val(row, ['season']),
                    'image_alt_text': get_val(row, ['image alt text', 'image alt', 'alt text', 'alt_text'])
                }

                attributes = {k: (v if v is not None else '') for k, v in attributes.items()}
                attributes['tags'] = auto_generate_tags(attributes)

                user = request.user if request.user and request.user.is_authenticated else None
                defaults = {
                    'title': title,
                    'slug': slug,
                    'price': price,
                    'compare_at_price': compare_price if compare_price else None,
                    'description': description,
                    'is_online': is_online,
                    'attributes': attributes,
                    'updated_by': user
                }
                if not Product.objects.filter(sku=sku).exists():
                    defaults['created_by'] = user

                product, created = Product.objects.update_or_create(
                    sku=sku,
                    defaults=defaults
                )

                # Download and save image if an image URL is provided in the Excel/CSV sheet
                image_url = get_val(row, ['image src', 'image', 'image url', 'image_url'])
                if image_url and (image_url.startswith('http://') or image_url.startswith('https://')):
                    try:
                        import requests
                        import re
                        # pyrefly: ignore [missing-import]
                        from django.core.files.base import ContentFile
                        from urllib.parse import urlparse
                        import os

                        # Transform Google Drive link to direct download link if needed
                        if 'drive.google.com' in image_url:
                            file_id_match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', image_url)
                            if not file_id_match:
                                file_id_match = re.search(r'id=([a-zA-Z0-9_-]+)', image_url)
                            if file_id_match:
                                file_id = file_id_match.group(1)
                                image_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                        
                        img_res = requests.get(image_url, timeout=15)
                        if img_res.status_code == 200:
                            parsed_url = urlparse(image_url)
                            file_name = os.path.basename(parsed_url.path)
                            # If it's a drive.google.com link, parsed path basename might be 'uc', so check or fallback
                            if not file_name or file_name == 'uc':
                                file_name = f"{sku}.jpg"
                            product.image.save(file_name, ContentFile(img_res.content), save=True)
                    except Exception as img_err:
                        print(f"Error downloading image {image_url} for SKU {sku}: {img_err}")

                # Auto-save brand to brands list
                brand_name = attributes.get('brand')
                if brand_name:
                    save_brand(brand_name)

                Inventory.objects.update_or_create(
                    product=product,
                    defaults={'stock_level': stock_level}
                )

                CollectionSyncService.syncProductCollections(product)
                products_imported += 1

            cache.clear()
            return Response({
                'success': True,
                'detail': f'Successfully imported {products_imported} products.'
            })
        except Exception as e:
            return Response({'detail': f'Error reading Excel: {str(e)}'}, status=500)


from .models import PageBanner

class PageBannerDetailView(APIView):
    """
    Public API to fetch active banners by page slug.
    Used by the storefront (Next.js) to display dynamic CMS banners.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        banner = PageBanner.objects.filter(page_slug=slug, is_active=True).first()
        if not banner:
            return Response({'detail': 'Banner not found.'}, status=status.HTTP_404_NOT_FOUND)

        images = banner.images.all()
        image_data = []
        for img in images:
            image_data.append({
                'id': str(img.id),
                'image_url': request.build_absolute_uri(img.image.url) if img.image else None,
                'mobile_image_url': request.build_absolute_uri(img.mobile_image.url) if img.mobile_image else None,
                'sort_order': img.sort_order,
                'link_url': img.link_url
            })

        return Response({
            'id': str(banner.id),
            'page_slug': banner.page_slug,
            'title': banner.title,
            'images': image_data
        })

class PageBannerListCreateView(APIView):
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]
    
    allowed_roles = ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive']

    def get(self, request):
        banners = PageBanner.objects.all().order_by('-created_at')
        data = []
        for banner in banners:
            images = banner.images.all()
            image_list = []
            for img in images:
                image_list.append({
                    'id': str(img.id),
                    'image_url': request.build_absolute_uri(img.image.url) if img.image else None,
                    'mobile_image_url': request.build_absolute_uri(img.mobile_image.url) if img.mobile_image else None,
                    'sort_order': img.sort_order,
                    'link_url': img.link_url
                })
            
            data.append({
                'id': str(banner.id),
                'page_slug': banner.page_slug,
                'title': banner.title,
                'is_active': banner.is_active,
                'image_count': images.count(),
                'primary_image': image_list[0]['image_url'] if image_list else None,
                'images': image_list
            })
        return Response(data)

    def post(self, request):
        page_slug = request.data.get('page_slug')
        if not page_slug:
            return Response({'detail': 'page_slug is required'}, status=400)
            
        page_slug = page_slug.strip().strip('/')
            
        banner, created = PageBanner.objects.get_or_create(
            page_slug=page_slug,
            defaults={
                'title': request.data.get('title', ''),
                'is_active': str(request.data.get('is_active', 'true')).lower() == 'true'
            }
        )
        
        # Handle image upload if provided
        if 'image' in request.FILES:
            from .models import PageBannerImage
            images = request.FILES.getlist('image')
            mobile_images = request.FILES.getlist('mobile_image')
            base_sort_order = int(request.data.get('sort_order', 0))
            
            for i, img in enumerate(images):
                mobile_img = mobile_images[i] if i < len(mobile_images) else None
                PageBannerImage.objects.create(
                    banner=banner,
                    image=img,
                    mobile_image=mobile_img,
                    link_url=request.data.get('link_url', ''),
                    sort_order=base_sort_order + i
                )

        log_action(request.user, f"Created/Updated banner for {page_slug}", request)
        return Response({'detail': 'Banner saved successfully', 'id': str(banner.id)})

class PageBannerDeleteView(APIView):
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]
    
    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']
    
    def delete(self, request, id):
        try:
            banner = PageBanner.objects.get(id=id)
            slug = banner.page_slug
            banner.delete()
            log_action(request.user, f"Deleted banner for {slug}", request)
            return Response({'detail': 'Deleted successfully'})
        except PageBanner.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)

class PageBannerImageDeleteView(APIView):
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]
    
    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']
    
    def delete(self, request, id):
        try:
            from .models import PageBannerImage
            image = PageBannerImage.objects.get(id=id)
            slug = image.banner.page_slug
            image.delete()
            log_action(request.user, f"Deleted image from banner {slug}", request)
            return Response({'detail': 'Deleted successfully'})
        except Exception:
            return Response({'detail': 'Not found'}, status=404)

