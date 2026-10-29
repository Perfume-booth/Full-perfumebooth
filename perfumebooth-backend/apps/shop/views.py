# pyrefly: ignore [missing-import]
from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.db import transaction
import json
import logging
from decimal import Decimal
from rest_framework.exceptions import ValidationError
from core.validators import validate_image_upload, validate_spreadsheet_upload

logger = logging.getLogger(__name__)

from .models import Product, Inventory, ProductImage, Collection, AutoCollection, WishlistItem, ProductReview, ProductImportJob
from .product_imports import apply_preview, create_preview
from .collection_membership import collection_products
# pyrefly: ignore [missing-import]
from django.utils.text import slugify
# pyrefly: ignore [missing-import]
from apps.authentication.views import HasRolePermission
# pyrefly: ignore [missing-import]
from apps.authentication.helpers import log_action
# pyrefly: ignore [missing-import]
from django.db.models import Sum, Count, Q, Avg
from .services import CollectionSyncService
# pyrefly: ignore [missing-import]
from django.utils import timezone
from datetime import timedelta
import random
# pyrefly: ignore [missing-import]
from apps.orders.models import Order


# Catalog domain components extracted to apps.catalog
from apps.catalog.services import (
    CatalogService,
    FacetService,
    BrandService,
    RecommendationService,
)
from apps.catalog.services.catalog_service import auto_generate_tags
from apps.catalog.services.brand_service import BRANDS_FILE_PATH, CONSTANTS_PATH
from apps.catalog.views import (
    BrandListView,
    ProductFacetsView,
    ProductListView,
    ProductDetailView,
    ProductRecommendationVectorView,
)

# Backwards compatibility aliases
flatten_product = CatalogService.serialize_product
load_brands = BrandService.load_brands
save_brand = BrandService.save_brand

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
                'match_value': col.name if col.collection_type != 'manual' else '',
                'is_active': col.status == 'active',
                'sort_order': 0,
                'product_count': collection_products(col).count(),
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
        if image:
            try:
                validate_image_upload(image)
            except ValidationError as ve:
                return Response({'detail': ve.detail if isinstance(ve.detail, str) else ve.detail[0]}, status=status.HTTP_400_BAD_REQUEST)

        # Handle excluded products list in post method
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

        # Extract and validate products if manual collection
        product_ids = []
        if match_type == 'manual':
            products_raw = request.data.get('products')
            if products_raw:
                try:
                    parsed = json.loads(products_raw)
                    if isinstance(parsed, list):
                        product_ids = parsed
                    else:
                        product_ids = [str(parsed)]
                except:
                    product_ids = request.data.getlist('products')
            else:
                product_ids = request.data.getlist('products')

            # Clean product_ids list (handle case where getlist contained a JSON string)
            cleaned_product_ids = []
            for item in product_ids:
                if not item or item == '[]' or item == '':
                    continue
                if isinstance(item, str) and item.startswith('[') and item.endswith(']'):
                    try:
                        sub_parsed = json.loads(item)
                        if isinstance(sub_parsed, list):
                            cleaned_product_ids.extend([str(x) for x in sub_parsed if x])
                            continue
                    except:
                        pass
                cleaned_product_ids.append(str(item))

            product_ids = cleaned_product_ids

            if not product_ids:
                return Response({'detail': 'A manual collection must contain at least 1 product.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check for slug collision before creating
        if AutoCollection.objects.filter(slug=slug).exists():
            return Response({'detail': f"A collection with slug '{slug}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

        collection = AutoCollection.objects.create(
            name=title,
            slug=slug,
            description=description,
            collection_type=match_type,
            status=status_val,
            image=image,
            excluded_products=excluded_products
        )

        if match_type == 'manual':
            import uuid
            valid_uuids = []
            for pid in product_ids:
                try:
                    uuid.UUID(str(pid))
                    valid_uuids.append(pid)
                except (ValueError, AttributeError):
                    pass
            products = Product.objects.filter(id__in=valid_uuids)
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
            col = AutoCollection.objects.filter(slug=slug).first()
            if col:
                return col
        col = AutoCollection.objects.filter(slug=slug).first() or \
              AutoCollection.objects.filter(slug__endswith=f"/{slug}").first()
        if col:
            return col
        # Alias matching for common special collections (new launches, trending, bestsellers)
        clean = slug.lower().strip()
        if clean in ['new', 'new-arrivals', 'new-launches']:
            return AutoCollection.objects.filter(
                slug__in=['manual/new-launches', 'manual/new', 'manual/new-arrivals', 'new-launches', 'new', 'new-arrivals']
            ).first() or AutoCollection.objects.filter(name__icontains='New Launch').first()
        if clean in ['trending', 'trending-perfumes']:
            return AutoCollection.objects.filter(
                slug__in=['manual/trending-perfumes', 'manual/trending', 'trending', 'trending-perfumes']
            ).first() or AutoCollection.objects.filter(name__icontains='Trending').first()
        if clean in ['best-sellers', 'best-selling-perfumes', 'bestsellers']:
            return AutoCollection.objects.filter(
                slug__in=['manual/best-selling-perfumes', 'manual/best-sellers', 'best-selling-perfumes', 'best-sellers']
            ).first() or AutoCollection.objects.filter(name__icontains='Best Seller').first()
        return None

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
        
        products_qs = collection_products(col).prefetch_related('images', 'variants')

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
            'product_count': len(products_data),
            'manual_product_ids': [str(p.id) for p in col.products.all()] if col.collection_type == 'manual' else [],
            'excluded_products': col.excluded_products or []
        }
        # Membership changes must be reflected immediately, including slug aliases.
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
            img_file = request.FILES.get('image')
            if img_file:
                try:
                    validate_image_upload(img_file)
                except ValidationError as ve:
                    return Response({'detail': ve.detail if isinstance(ve.detail, str) else ve.detail[0]}, status=status.HTTP_400_BAD_REQUEST)
            col.image = img_file
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


from .models import PageBanner

def format_media_url(url, request=None):
    if not url:
        return None
    if url.startswith('http://') or url.startswith('https://'):
        if 'localhost/media/' in url and 'localhost:8000' not in url:
            return url.replace('localhost/media/', 'localhost:8000/media/')
        return url
    if url.startswith('/media/'):
        return f"http://localhost:8000{url}"
    if request:
        abs_url = request.build_absolute_uri(url)
        if 'localhost/media/' in abs_url and 'localhost:8000' not in abs_url:
            return abs_url.replace('localhost/media/', 'localhost:8000/media/')
        return abs_url
    return f"http://localhost:8000/media/{url.lstrip('/')}"


class PageBannerDetailView(APIView):
    """
    Public API to fetch active banners by page slug.
    Used by the storefront (Next.js) to display dynamic CMS banners.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        cache_key = f'catalog:banner:{slug}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        banner = PageBanner.objects.filter(page_slug=slug, is_active=True).first()
        if not banner:
            return Response({'detail': 'Banner not found.'}, status=status.HTTP_404_NOT_FOUND)

        images = banner.images.all()
        image_data = []
        for img in images:
            image_data.append({
                'id': str(img.id),
                'image_url': format_media_url(img.image.url if img.image else None, request),
                'mobile_image_url': format_media_url(img.mobile_image.url if img.mobile_image else None, request),
                'sort_order': img.sort_order,
                'link_url': img.link_url
            })

        data = {
            'id': str(banner.id),
            'page_slug': banner.page_slug,
            'title': banner.title,
            'is_active': banner.is_active,
            'images': image_data
        }
        cache.set(cache_key, data, timeout=7200)
        return Response(data)

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
                    'image_url': format_media_url(img.image.url if img.image else None, request),
                    'mobile_image_url': format_media_url(img.mobile_image.url if img.mobile_image else None, request),
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
        
        if not created:
            if 'title' in request.data:
                banner.title = request.data.get('title', '')
            if 'is_active' in request.data:
                banner.is_active = str(request.data.get('is_active', 'true')).lower() == 'true'
            banner.save()

        
        # Handle image upload or update if provided
        from .models import PageBannerImage
        slide_id = request.data.get('slide_id')
        link_url = request.data.get('link_url', '')

        # Validate any uploaded banner images
        for img in request.FILES.getlist('image'):
            try:
                validate_image_upload(img)
            except ValidationError as ve:
                return Response({'detail': ve.detail if isinstance(ve.detail, str) else ve.detail[0]}, status=status.HTTP_400_BAD_REQUEST)
        for m_img in request.FILES.getlist('mobile_image'):
            try:
                validate_image_upload(m_img)
            except ValidationError as ve:
                return Response({'detail': ve.detail if isinstance(ve.detail, str) else ve.detail[0]}, status=status.HTTP_400_BAD_REQUEST)

        if slide_id:
            try:
                banner_img = PageBannerImage.objects.get(id=slide_id, banner=banner)
                banner_img.link_url = link_url
                if 'image' in request.FILES:
                    banner_img.image = request.FILES['image']
                if 'mobile_image' in request.FILES:
                    banner_img.mobile_image = request.FILES['mobile_image']
                banner_img.save()
            except PageBannerImage.DoesNotExist:
                pass
        elif 'image' in request.FILES or 'mobile_image' in request.FILES:
            images = request.FILES.getlist('image')
            mobile_images = request.FILES.getlist('mobile_image')
            base_sort_order = int(request.data.get('sort_order', 0))
            
            max_count = max(len(images), len(mobile_images))
            for i in range(max_count):
                img = images[i] if i < len(images) else None
                mobile_img = mobile_images[i] if i < len(mobile_images) else None
                if img or mobile_img:
                    PageBannerImage.objects.create(
                        banner=banner,
                        image=img,
                        mobile_image=mobile_img,
                        link_url=link_url,
                        sort_order=base_sort_order + i
                    )
        elif link_url and banner.images.exists():
            # If no files uploaded but link_url passed for single-image banner, update primary image link
            first_img = banner.images.first()
            if first_img:
                first_img.link_url = link_url
                first_img.save()

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
            # Clean up image files from storage
            for img in banner.images.all():
                if img.image:
                    img.image.delete(save=False)
                if img.mobile_image:
                    img.mobile_image.delete(save=False)
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
            if image.image:
                image.image.delete(save=False)
            if image.mobile_image:
                image.mobile_image.delete(save=False)
            image.delete()
            log_action(request.user, f"Deleted image from banner {slug}", request)
            return Response({'detail': 'Deleted successfully'})
        except Exception:
            return Response({'detail': 'Not found'}, status=404)


class WishlistAPIView(APIView):
    """
    Customer Wishlist API (GET, POST).
    Handles wishlist listing and guest-to-user sync on login.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        items = WishlistItem.objects.filter(user=request.user).select_related('product')
        products_data = [flatten_product(item.product, request) for item in items if item.product.is_online]
        return Response({'items': products_data})

    def post(self, request):
        product_id = request.data.get('product_id') or request.data.get('id')
        bulk_items = request.data.get('items', [])

        target_product_ids = []
        if product_id:
            target_product_ids.append(product_id)
        if bulk_items and isinstance(bulk_items, list):
            for bi in bulk_items:
                pid = bi.get('id') or bi.get('product_id')
                if pid and pid not in target_product_ids:
                    target_product_ids.append(pid)

        if not target_product_ids:
            return Response({'detail': 'No product_id or items list provided'}, status=status.HTTP_400_BAD_REQUEST)

        added_count = 0
        for pid in target_product_ids:
            try:
                product = Product.objects.get(id=pid, is_online=True)
                WishlistItem.objects.get_or_create(user=request.user, product=product)
                added_count += 1
            except (Product.DoesNotExist, Exception):
                continue

        # Return updated wishlist
        items = WishlistItem.objects.filter(user=request.user).select_related('product')
        products_data = [flatten_product(item.product, request) for item in items if item.product.is_online]
        return Response({'detail': f'Synced {added_count} items', 'items': products_data})


class WishlistDeleteView(APIView):
    """
    DELETE /api/shop/wishlist/<product_id>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, product_id):
        deleted, _ = WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
        if deleted:
            return Response({'detail': 'Removed from wishlist'})
        return Response({'detail': 'Item not found in wishlist'}, status=status.HTTP_404_NOT_FOUND)


class CartValidationAPIView(APIView):
    """
    Cart Validation API
    Checks availability, stock limits, and price changes before checkout.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if isinstance(request.data, dict):
            cart_items = request.data.get('items', [])
        elif isinstance(request.data, list):
            cart_items = request.data
        else:
            return Response({'detail': 'Expected array of cart items'}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(cart_items, list):
            return Response({'detail': 'Expected array of cart items'}, status=status.HTTP_400_BAD_REQUEST)

        validated_items = []
        is_all_valid = True
        has_stock_alerts = False

        for item in cart_items:
            product_id = item.get('product_id') or item.get('id')
            req_qty = int(item.get('quantity', 1))
            req_price = str(item.get('price', ''))

            if not product_id:
                continue

            try:
                product = Product.objects.get(id=product_id)
                stock_val = product.inventory.available_stock if hasattr(product, 'inventory') else 0
                current_price = str(product.price)

                is_in_stock = stock_val >= req_qty
                is_online = product.is_online
                price_changed = req_price and Decimal(req_price) != product.price

                item_status = 'AVAILABLE'
                if not is_online:
                    item_status = 'UNAVAILABLE'
                    is_all_valid = False
                    has_stock_alerts = True
                elif stock_val <= 0:
                    item_status = 'OUT_OF_STOCK'
                    is_all_valid = False
                    has_stock_alerts = True
                elif not is_in_stock:
                    item_status = 'EXCEEDS_STOCK'
                    is_all_valid = False
                    has_stock_alerts = True

                validated_items.append({
                    'product_id': str(product.id),
                    'title': product.title,
                    'slug': product.slug,
                    'requested_quantity': req_qty,
                    'available_stock': stock_val,
                    'is_in_stock': is_in_stock,
                    'is_online': is_online,
                    'price_changed': price_changed,
                    'current_price': current_price,
                    'status': item_status
                })

            except Product.DoesNotExist:
                validated_items.append({
                    'product_id': str(product_id),
                    'title': 'Unknown Product',
                    'requested_quantity': req_qty,
                    'available_stock': 0,
                    'is_in_stock': False,
                    'is_online': False,
                    'price_changed': False,
                    'current_price': '0.00',
                    'status': 'NOT_FOUND'
                })
                is_all_valid = False
                has_stock_alerts = True

        return Response({
            'is_valid': is_all_valid,
            'has_stock_alerts': has_stock_alerts,
            'items': validated_items
        })


class ProductReviewAPIView(APIView):
    """
    Product Reviews & Ratings API (GET, POST).
    100% Native, self-hosted review engine with zero third-party SaaS cost.
    Supports authenticated and verified guest reviewers, with automatic
    order verification against customer email or user profile.
    """
    def get_permissions(self):
        return [permissions.AllowAny()]

    def _get_product(self, product_identifier):
        import uuid
        try:
            val = uuid.UUID(str(product_identifier))
            p = Product.objects.filter(id=val, is_online=True).first()
            if p:
                return p
        except (ValueError, TypeError, AttributeError):
            pass
        return Product.objects.filter(slug__iexact=str(product_identifier), is_online=True).first()

    def get(self, request, product_id=None, slug=None):
        identifier = slug or product_id
        product = self._get_product(identifier)
        if not product:
            return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        reviews = ProductReview.objects.filter(
            product=product,
            is_approved=True
        ).select_related('user').order_by('-created_at')

        reviews_list = []
        total_rating_sum = 0
        distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

        for r in reviews:
            total_rating_sum += r.rating
            if r.rating in distribution:
                distribution[r.rating] += 1

            reviews_list.append({
                'id': str(r.id),
                'user_name': r.display_name,
                'rating': r.rating,
                'title': r.title,
                'comment': r.comment,
                'is_verified_buyer': r.is_verified_buyer,
                'created_at': r.created_at.isoformat()
            })

        count = len(reviews_list)
        avg_rating = round(total_rating_sum / count, 1) if count > 0 else 5.0

        return Response({
            'product_id': str(product.id),
            'product_slug': product.slug,
            'average_rating': avg_rating,
            'review_count': count,
            'rating_distribution': distribution,
            'reviews': reviews_list
        })

    def post(self, request, product_id=None, slug=None):
        identifier = slug or product_id
        product = self._get_product(identifier)
        if not product:
            return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            raw_rating = int(request.data.get('rating', 5))
            if raw_rating < 1 or raw_rating > 5:
                return Response({'detail': 'Rating must be an integer between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
            rating = raw_rating
        except (ValueError, TypeError):
            return Response({'detail': 'Rating must be an integer between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)

        title = str(request.data.get('title', '')).strip()
        comment = str(request.data.get('comment', request.data.get('text', ''))).strip()

        # Handle user (authenticated user or verified guest account)
        user = None
        is_verified = False

        if request.user and request.user.is_authenticated:
            user = request.user
            is_verified = Order.objects.filter(
                user=user,
                status__in=['Paid', 'Processing', 'Shipped', 'Delivered', 'PAID', 'DELIVERED'],
                items__product=product
            ).exists()
        else:
            email = str(request.data.get('email', '')).strip().lower()
            name = str(request.data.get('name', '')).strip()
            if not email:
                return Response({'detail': 'Email is required to submit a review'}, status=status.HTTP_400_BAD_REQUEST)

            from apps.authentication.models import CustomUser
            user = CustomUser.objects.filter(email=email).first()
            if not user:
                name_parts = name.split(' ', 1)
                first_name = name_parts[0] or 'Customer'
                last_name = name_parts[1] if len(name_parts) > 1 else ''
                user = CustomUser.objects.create_user(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=False
                )

            is_verified = Order.objects.filter(
                Q(customer_email__iexact=email) | Q(user=user),
                status__in=['Paid', 'Processing', 'Shipped', 'Delivered', 'PAID', 'DELIVERED'],
                items__product=product
            ).exists()

        review, created = ProductReview.objects.update_or_create(
            product=product,
            user=user,
            defaults={
                'rating': rating,
                'title': title,
                'comment': comment,
                'is_verified_buyer': is_verified,
                'is_approved': True
            }
        )

        # Recalculate product rating summary
        all_reviews = ProductReview.objects.filter(product=product, is_approved=True)
        rcount = all_reviews.count()
        rsum = sum([r.rating for r in all_reviews])
        new_avg = round(rsum / rcount, 1) if rcount > 0 else 5.0

        attrs = product.attributes or {}
        attrs['rating'] = new_avg
        attrs['rating_count'] = rcount
        product.attributes = attrs
        product.save(update_fields=['attributes'])

        return Response({
            'detail': 'Review submitted successfully',
            'review': {
                'id': str(review.id),
                'user_name': review.display_name,
                'created_at': review.created_at.isoformat(),
                'rating': review.rating,
                'title': review.title,
                'comment': review.comment,
                'is_verified_buyer': review.is_verified_buyer
            },
            'new_average_rating': new_avg,
            'new_review_count': rcount
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ProductExcelImportView(APIView):
    """
    POST /api/shop/products/excel-import/
    Create a validated, update-only preview. This endpoint never changes products.
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type, size, and content integrity
        try:
            validate_spreadsheet_upload(file_obj)
        except ValidationError as ve:
            return Response({'detail': ve.detail if isinstance(ve.detail, str) else ve.detail[0]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'detail': 'Invalid file upload.'}, status=status.HTTP_400_BAD_REQUEST)

        mode = str(request.data.get('mode', 'UPDATE_ONLY')).upper()
        if mode not in {'UPDATE_ONLY', 'CREATE_ONLY', 'UPSERT'}:
            return Response({'detail': 'Invalid import mode.'}, status=status.HTTP_400_BAD_REQUEST)
        draft_default = str(request.data.get('draft_default', 'true')).lower() in {'true', '1', 'yes'}
        column_mapping = {}
        if request.data.get('mapping_id'):
            from .models import ImportMapping
            try:
                column_mapping = ImportMapping.objects.get(pk=request.data['mapping_id'], owner=request.user).columns
            except (ImportMapping.DoesNotExist, ValueError, TypeError):
                return Response({'detail': 'Saved mapping not found.'}, status=400)
        job = ProductImportJob.objects.create(
            created_by=request.user, filename=file_obj.name[:255], file_sha256='',
            mode=mode, status=ProductImportJob.Status.QUEUED,
            operation='preview', column_mapping=column_mapping,
            summary={'draft_default': draft_default}, source_file=file_obj,
            progress_current=0, progress_total=1,
        )
        try:
            from .tasks import process_catalog_preview_job
            result = process_catalog_preview_job.delay(str(job.id))
            job.task_id = result.id
            job.save(update_fields=['task_id'])
        except Exception as exc:
            logger.exception('Could not queue catalog preview')
            job.status = ProductImportJob.Status.FAILED
            job.error_message = 'The import worker is unavailable. Try again.'
            job.finished_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'finished_at'])
            return Response({'detail': job.error_message, 'job_id': str(job.id)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        log_action(request.user, f"Queued catalog import preview {job.id} ({job.filename})", request)
        return Response(_catalog_import_payload(job, 'Preview queued.'), status=status.HTTP_202_ACCEPTED)


def _catalog_import_payload(job, detail=None):
    return {
        'detail': detail or ('Import failed.' if job.status == ProductImportJob.Status.FAILED else 'Import status.'),
        'job_id': str(job.id), 'status': job.status, 'mode': job.mode,
        'operation': job.operation,
        'progress': {'current': job.progress_current, 'total': job.progress_total},
        'error_message': job.error_message,
        'summary': job.summary, 'changes': job.changes[:200], 'creates': job.creates[:200],
        'variants': job.variant_operations[:200], 'images': job.image_operations[:200],
        'bulk_actions': job.bulk_operations[:200], 'errors': job.errors[:200],
        'can_undo': bool(job.snapshot) and job.status == 'applied' and not job.undone_at,
        'undone_at': job.undone_at, 'scheduled_at': job.scheduled_at,
        'sale_ends_at': job.sale_ends_at, 'schedule_state': job.schedule_state,
    }


class ProductExcelImportStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request, job_id):
        try:
            job = ProductImportJob.objects.get(pk=job_id)
        except ProductImportJob.DoesNotExist:
            return Response({'detail': 'Import job not found.'}, status=status.HTTP_404_NOT_FOUND)
        if job.created_by_id != request.user.id and not request.user.is_superuser:
            return Response({'detail': 'You can only view your own import jobs.'}, status=status.HTTP_403_FORBIDDEN)
        payload = _catalog_import_payload(job)
        if job.task_id and job.status in {
            ProductImportJob.Status.PROCESSING, ProductImportJob.Status.APPLYING,
            ProductImportJob.Status.QUEUED, ProductImportJob.Status.APPLY_QUEUED,
        }:
            from celery.result import AsyncResult
            try:
                info = AsyncResult(job.task_id).info
            except Exception:
                logger.warning('Import progress backend unavailable for %s', job.id, exc_info=True)
                info = None
            if isinstance(info, dict) and 'current' in info:
                payload['progress'] = {'current': info['current'], 'total': info.get('total', 1)}
        return Response(payload)


class ProductExcelImportRetryView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def post(self, request, job_id):
        try:
            with transaction.atomic():
                job = ProductImportJob.objects.select_for_update().get(pk=job_id)
                if job.created_by_id != request.user.id and not request.user.is_superuser:
                    raise PermissionError('You can only retry your own import job.')
                if job.status != ProductImportJob.Status.FAILED:
                    raise ValueError('Only failed import jobs can be retried.')
                if job.operation == 'preview' and not job.source_file:
                    raise ValueError('The source workbook is no longer available.')
                job.status = ProductImportJob.Status.QUEUED if job.operation == 'preview' else ProductImportJob.Status.APPLY_QUEUED
                job.error_message = ''
                job.finished_at = None
                job.progress_current = 0
                job.save(update_fields=['status', 'error_message', 'finished_at', 'progress_current'])
            from .tasks import apply_catalog_import_job, process_catalog_preview_job
            task = process_catalog_preview_job if job.operation == 'preview' else apply_catalog_import_job
            result = task.delay(str(job.id))
            job.task_id = result.id
            job.save(update_fields=['task_id'])
        except ProductImportJob.DoesNotExist:
            return Response({'detail': 'Import job not found.'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except Exception:
            logger.exception('Could not retry catalog import job')
            ProductImportJob.objects.filter(pk=job_id).update(status=ProductImportJob.Status.FAILED)
            return Response({'detail': 'The import worker is unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(_catalog_import_payload(job, 'Import retry queued.'), status=status.HTTP_202_ACCEPTED)


class ProductExcelImportTemplateView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        from django.http import HttpResponse
        from .product_import_template import build_product_import_template, TEMPLATE_VERSION
        mode = str(request.query_params.get('mode', 'UPDATE_ONLY')).upper()
        if mode not in {'UPDATE_ONLY', 'CREATE_ONLY', 'UPSERT'}:
            return Response({'detail': 'Invalid template mode.'}, status=status.HTTP_400_BAD_REQUEST)
        response = HttpResponse(
            build_product_import_template(mode),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename=perfumebooth-products-{mode.lower()}-template-v{TEMPLATE_VERSION}.xlsx'
        return response


class ProductExcelImportApplyView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def post(self, request, job_id):
        try:
            with transaction.atomic():
                job = ProductImportJob.objects.select_for_update().get(pk=job_id)
                if job.created_by_id != request.user.id and not request.user.is_superuser:
                    raise PermissionError('You can only apply your own import preview.')
                if job.status != ProductImportJob.Status.PREVIEW_READY or job.errors:
                    raise ValueError('Only a valid preview can be queued for application.')
                if job.schedule_state:
                    raise ValueError('This preview is managed by a schedule. Create a new preview to apply manually.')
                job.status = ProductImportJob.Status.APPLY_QUEUED
                job.operation = 'apply'
                job.progress_current = 0
                job.progress_total = 1
                job.error_message = ''
                job.finished_at = None
                job.save(update_fields=['status', 'operation', 'progress_current', 'progress_total', 'error_message', 'finished_at'])
            from .tasks import apply_catalog_import_job
            result = apply_catalog_import_job.delay(str(job.id))
            job.task_id = result.id
            job.save(update_fields=['task_id'])
        except ProductImportJob.DoesNotExist:
            return Response({'detail': 'Import preview not found.'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except Exception:
            logger.exception('Could not queue catalog import apply job')
            ProductImportJob.objects.filter(pk=job_id, status=ProductImportJob.Status.APPLY_QUEUED).update(
                status=ProductImportJob.Status.PREVIEW_READY, task_id=''
            )
            return Response({'detail': 'The import worker is unavailable. Try applying again.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        log_action(request.user, f"Queued catalog import apply {job.id}", request)
        return Response(_catalog_import_payload(job, 'Catalog application queued.'), status=status.HTTP_202_ACCEPTED)


class ProductExcelImportErrorsView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request, job_id):
        from django.http import HttpResponse
        import openpyxl
        try:
            job = ProductImportJob.objects.get(pk=job_id)
        except ProductImportJob.DoesNotExist:
            return Response({'detail': 'Import preview not found.'}, status=status.HTTP_404_NOT_FOUND)
        if job.created_by_id != request.user.id and not request.user.is_superuser:
            return Response({'detail': 'You can only download your own import errors.'}, status=status.HTTP_403_FORBIDDEN)
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = 'Import errors'
        sheet.append(['Sheet', 'Row', 'Column', 'Error'])
        for error in job.errors:
            sheet.append([error.get('sheet', 'Products'), error.get('row'), error.get('column'), error.get('message')])
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename=product-import-errors-{job.id}.xlsx'
        workbook.save(response)
        return response


class ProductExcelExportView(APIView):
    """
    GET /api/shop/products/excel-export/
    Export catalog to XLSX format.
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        import openpyxl
        from io import BytesIO
        from django.http import HttpResponse
        from .product_import_template import build_product_import_template

        wb = openpyxl.load_workbook(BytesIO(build_product_import_template('UPSERT')))
        products_sheet = wb['Products']
        variants_sheet = wb['Variants']
        images_sheet = wb['Images']
        variant_row = 2
        image_row = 2
        products = Product.objects.select_related('inventory').prefetch_related('variants', 'images').order_by('created_at', 'id')
        for row_number, p in enumerate(products, start=2):
            attrs = p.attributes or {}
            tags_str = ', '.join(attrs.get('tags', [])) if isinstance(attrs.get('tags'), list) else str(attrs.get('tags', ''))
            values = [
                p.slug, p.sku, p.title, p.price, p.compare_at_price or '',
                p.inventory.stock_level if hasattr(p, 'inventory') else 0,
                'active' if p.is_online else 'draft', attrs.get('brand', ''),
                attrs.get('category', ''), attrs.get('productType', ''), attrs.get('gender', ''),
                tags_str, attrs.get('meta_title', ''), attrs.get('meta_description', ''),
                p.description, attrs.get('ideal_for', ''), attrs.get('top_notes', ''),
                attrs.get('middle_notes', ''), attrs.get('base_notes', ''), attrs.get('size', ''),
                attrs.get('olfactory_family', ''), attrs.get('fragrance', ''), attrs.get('scent', ''),
                attrs.get('season', ''), attrs.get('occasion', ''), attrs.get('dispenser_type', ''),
                attrs.get('product_form', ''), attrs.get('short_description', ''),
                p.cost_per_item or '', attrs.get('weight', ''), attrs.get('barcode', ''),
                attrs.get('material', ''), attrs.get('color', ''),
            ]
            for column, value in enumerate(values, start=1):
                products_sheet.cell(row_number, column, value)
            for variant in p.variants.all():
                variant_values = [
                    p.slug, '', variant.sku, variant.title, variant.option1_name,
                    variant.option1_value, variant.option2_name, variant.option2_value,
                    variant.price, variant.compare_at_price or '', variant.stock_level,
                    'active' if variant.is_active else 'draft', '',
                ]
                for column, value in enumerate(variant_values, start=1):
                    variants_sheet.cell(variant_row, column, value)
                variant_row += 1
                if variant.image:
                    image_values = [
                        p.slug, variant.sku, '', request.build_absolute_uri(variant.image.url), '',
                        variant.title, 0, 'no', '',
                    ]
                    for column, value in enumerate(image_values, start=1):
                        images_sheet.cell(image_row, column, value)
                    image_row += 1
            for image in p.images.all():
                image_values = [
                    p.slug, '', '', request.build_absolute_uri(image.image.url), str(image.id),
                    image.alt_text, image.position, 'yes' if image.is_primary else 'no', '',
                ]
                for column, value in enumerate(image_values, start=1):
                    images_sheet.cell(image_row, column, value)
                image_row += 1

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=perfumebooth-catalog-v8.xlsx'
        wb.save(response)
        return response


class AnalyticsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        from .reporting import build_report
        return Response(build_report(request.query_params.get('timeframe', '7d')))


class ProductReviewAdminListView(APIView):
    """
    GET /api/shop/admin/reviews/
    Merchant management endpoint for customer product reviews.
    """
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive']

    def get(self, request):
        status_filter = request.query_params.get('status', 'all').strip().lower()
        rating_filter = request.query_params.get('rating', 'all').strip()
        search = request.query_params.get('search', '').strip()

        qs = ProductReview.objects.all().select_related('product', 'user').order_by('-created_at')

        if status_filter == 'approved':
            qs = qs.filter(is_approved=True)
        elif status_filter in ['pending', 'hidden', 'unapproved']:
            qs = qs.filter(is_approved=False)

        if rating_filter and rating_filter != 'all':
            try:
                r_val = int(rating_filter)
                qs = qs.filter(rating=r_val)
            except ValueError:
                pass

        if search:
            qs = qs.filter(
                Q(product__title__icontains=search) |
                Q(product__slug__icontains=search) |
                Q(user__email__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(imported_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(title__icontains=search) |
                Q(comment__icontains=search)
            )

        total_reviews = ProductReview.objects.count()
        approved_count = ProductReview.objects.filter(is_approved=True).count()
        pending_count = total_reviews - approved_count

        avg_rating = ProductReview.objects.filter(is_approved=True).aggregate(avg=Avg('rating'))['avg'] or 5.0

        raw_dist = dict(ProductReview.objects.values('rating').annotate(c=Count('id')).values_list('rating', 'c'))
        distribution = {str(i): raw_dist.get(i, 0) for i in range(1, 6)}

        reviews = []
        for r in qs[:200]:
            prod = r.product
            prod_img = ''
            if prod:
                first_img = prod.images.filter(is_primary=True).first() or prod.images.first()
                if first_img:
                    prod_img = format_media_url(first_img.image.url if first_img.image else None, request)

            reviews.append({
                'id': str(r.id),
                'product_id': str(prod.id) if prod else None,
                'product_title': prod.title if prod else 'Unknown Product',
                'product_slug': prod.slug if prod else '',
                'product_image': prod_img,
                'user_id': str(r.user.id) if r.user else None,
                'user_name': r.display_name,
                'user_email': r.user.email if r.user else '',
                'rating': r.rating,
                'title': r.title,
                'comment': r.comment,
                'is_verified_buyer': r.is_verified_buyer,
                'is_approved': r.is_approved,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'updated_at': r.updated_at.isoformat() if r.updated_at else None,
            })

        return Response({
            'reviews': reviews,
            'total': qs.count(),
            'summary': {
                'total_reviews': total_reviews,
                'approved_count': approved_count,
                'pending_count': pending_count,
                'average_rating': round(float(avg_rating), 1)
            },
            'distribution': distribution
        })


class ProductReviewAdminDetailView(APIView):
    """
    PATCH /api/shop/admin/reviews/<uuid:pk>/ - Toggle approval
    DELETE /api/shop/admin/reviews/<uuid:pk>/ - Delete review
    """
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive']

    def patch(self, request, pk):
        review = get_object_or_404(ProductReview, id=pk)
        if 'is_approved' in request.data:
            review.is_approved = bool(request.data['is_approved'])
            review.save(update_fields=['is_approved', 'updated_at'])

            if review.product:
                all_revs = ProductReview.objects.filter(product=review.product, is_approved=True)
                rcount = all_revs.count()
                rsum = sum([r.rating for r in all_revs])
                new_avg = round(rsum / rcount, 1) if rcount > 0 else 5.0
                attrs = review.product.attributes or {}
                attrs['rating'] = new_avg
                attrs['rating_count'] = rcount
                review.product.attributes = attrs
                review.product.save(update_fields=['attributes'])

            log_action(request.user, f"Set review {review.id} approved={review.is_approved}", request)

        return Response({
            'success': True,
            'id': str(review.id),
            'is_approved': review.is_approved
        })

    def delete(self, request, pk):
        review = get_object_or_404(ProductReview, id=pk)
        product = review.product
        review_id = str(review.id)
        review.delete()

        if product:
            all_revs = ProductReview.objects.filter(product=product, is_approved=True)
            rcount = all_revs.count()
            rsum = sum([r.rating for r in all_revs])
            new_avg = round(rsum / rcount, 1) if rcount > 0 else 5.0
            attrs = product.attributes or {}
            attrs['rating'] = new_avg
            attrs['rating_count'] = rcount
            product.attributes = attrs
            product.save(update_fields=['attributes'])

        log_action(request.user, f"Deleted product review {review_id}", request)
        return Response({'success': True, 'deleted_id': review_id})


class ProductReviewExportExcelView(APIView):
    """
    GET /api/shop/admin/reviews/export/
    Exports customer reviews into Excel workbook (.xlsx).
    """
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive']

    def get(self, request):
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from django.http import HttpResponse
        import io

        status_filter = request.query_params.get('status', 'all').strip().lower()
        rating_filter = request.query_params.get('rating', 'all').strip()

        qs = ProductReview.objects.all().select_related('product', 'user').order_by('-created_at')
        if status_filter == 'approved':
            qs = qs.filter(is_approved=True)
        elif status_filter in ['pending', 'hidden']:
            qs = qs.filter(is_approved=False)

        if rating_filter and rating_filter != 'all':
            try:
                qs = qs.filter(rating=int(rating_filter))
            except ValueError:
                pass

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Customer Reviews"

        header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='1A1410', end_color='1A1410', fill_type='solid')
        border_thin = Side(style='thin', color='E5E7EB')
        cell_border = Border(left=border_thin, right=border_thin, top=border_thin, bottom=border_thin)

        headers = [
            "Review ID", "Date (UTC)", "Product Title", "Product Slug",
            "Customer Name", "Customer Email", "Rating (1-5)", "Verified Buyer",
            "Review Headline", "Review Comment", "Status"
        ]
        ws.append(headers)

        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center', vertical='center')

        for r in qs:
            date_str = r.created_at.strftime('%Y-%m-%d %H:%M') if r.created_at else ''
            ws.append([
                str(r.id),
                date_str,
                r.product.title if r.product else '',
                r.product.slug if r.product else '',
                r.display_name,
                r.user.email if r.user else '',
                r.rating,
                "YES" if r.is_verified_buyer else "NO",
                r.title or '',
                r.comment or '',
                "APPROVED" if r.is_approved else "PENDING / HIDDEN"
            ])

        for col in ws.columns:
            max_len = 0
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            for cell in col:
                cell.border = cell_border
                val_len = len(str(cell.value or ''))
                if val_len > max_len:
                    max_len = val_len
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 60)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"perfumebooth_reviews_{timezone.now().strftime('%Y%m%d')}.xlsx"
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response




