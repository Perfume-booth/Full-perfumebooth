from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
import json

from .models import Product, Inventory, ProductImage
from apps.authentication.views import HasRolePermission
from apps.authentication.helpers import log_action


class ProductListView(APIView):
    """GET /api/shop/products/ — Paginated product catalog."""
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        # Cache key: catalog:products:<page>
        page = request.query_params.get('page', 1)
        cache_key = f'catalog:products:page:{page}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        # Include items that are offline if requested by an authenticated merchant
        is_merchant = request.user and request.user.is_authenticated and any(
            role in ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )
        
        products = Product.objects.prefetch_related('images')
        if not is_merchant:
            products = products.filter(is_online=True)
            
        data = []
        for product in products:
            images_data = []
            for img in product.images.all():
                images_data.append({
                    'url': request.build_absolute_uri(img.image.url) if img.image else None,
                    'altText': img.alt_text,
                    'width': img.width,
                    'height': img.height
                })

            data.append({
                'id': str(product.id),
                'title': product.title,
                'slug': product.slug,
                'sku': product.sku,
                'price': str(product.price),
                'compare_at_price': str(product.compare_at_price) if product.compare_at_price else None,
                'image': request.build_absolute_uri(product.image.url) if product.image else None,
                'images': images_data,
                'attributes': product.attributes,
                'stock': product.inventory.stock_level if hasattr(product, 'inventory') else 0,
                'is_online': product.is_online,
            })

        cache.set(cache_key, data, timeout=7200)  # TTL: 2 hours
        return Response(data)

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

        product = Product.objects.create(
            title=title,
            slug=slug,
            sku=sku,
            price=price,
            compare_at_price=compare_at_price if compare_at_price else None,
            description=description,
            is_online=is_online,
            attributes=attributes,
            image=request.FILES.get('image')
        )
        
        stock_level = int(request.data.get('stock_level', 0))
        Inventory.objects.create(product=product, stock_level=stock_level)
        
        gallery_images = request.FILES.getlist('gallery')
        for img in gallery_images:
            ProductImage.objects.create(product=product, image=img)
            
        cache.clear()
        log_action(request.user, f"Created product '{product.title}' (SKU: {product.sku})", request)
        return Response({
            'id': str(product.id), 
            'slug': product.slug,
            'detail': 'Product created successfully.'
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

        images_data = []
        for img in product.images.all():
            images_data.append({
                'url': request.build_absolute_uri(img.image.url) if img.image else None,
                'altText': img.alt_text,
                'width': img.width,
                'height': img.height
            })

        data = {
            'id': str(product.id),
            'title': product.title,
            'slug': product.slug,
            'sku': product.sku,
            'description': product.description,
            'price': str(product.price),
            'compare_at_price': str(product.compare_at_price) if product.compare_at_price else None,
            'image': request.build_absolute_uri(product.image.url) if product.image else None,
            'images': images_data,
            'attributes': product.attributes,
            'stock': product.inventory.stock_level if hasattr(product, 'inventory') else 0,
            'is_online': product.is_online,
        }
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
                    product.attributes = json.loads(attributes)
                except json.JSONDecodeError:
                    pass
            elif isinstance(attributes, dict):
                product.attributes = attributes
                
        product.save()
        
        if 'stock_level' in request.data:
            stock = int(request.data['stock_level'])
            Inventory.objects.update_or_create(product=product, defaults={'stock_level': stock})
            
        gallery_images = request.FILES.getlist('gallery')
        for img in gallery_images:
            ProductImage.objects.create(product=product, image=img)
            
        cache.clear()
        log_action(request.user, f"Updated product '{product.title}' (SKU: {product.sku})", request)
        return Response({'detail': 'Product updated successfully.'})

    def delete(self, request, slug: str):
        try:
            product = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
            
        product_title = product.title
        product_sku = product.sku
        product.delete()
        cache.clear()
        log_action(request.user, f"Deleted product '{product_title}' (SKU: {product_sku})", request)
        return Response({'detail': 'Product deleted successfully.'})

