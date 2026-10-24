"""
Catalog Views — Thin Controllers for Product Catalog, Facets, Brands, and Recommendations.
All domain logic is delegated to CatalogService, FacetService, BrandService, and RecommendationService.
"""
import re
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.views import HasRolePermission
from .services import (
    CatalogService,
    FacetService,
    BrandService,
    RecommendationService,
)

BRAND_NAME_REGEX = re.compile(r"^[A-Za-z0-9 .\-&'+/]{1,100}$")


class BrandListView(APIView):
    """GET /api/v1/catalog/brands/ — List brands. POST / DELETE to manage brands."""
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive']

    def get(self, request):
        brands = BrandService.get_cached_brands()
        return Response(brands)

    def post(self, request):
        brand_name = request.data.get('brand')
        if not brand_name:
            return Response({'error': 'Brand name is required'}, status=status.HTTP_400_BAD_REQUEST)
        brand_name = str(brand_name).strip()
        if not BRAND_NAME_REGEX.match(brand_name):
            return Response({'error': 'Invalid brand name.'}, status=status.HTTP_400_BAD_REQUEST)
        brands = BrandService.save_brand(brand_name)
        return Response({'status': 'success', 'brands': brands})

    def put(self, request):
        old_brand = request.data.get('old_brand') or request.data.get('old_name')
        new_brand = request.data.get('new_brand') or request.data.get('new_name') or request.data.get('brand')
        if not old_brand or not new_brand:
            return Response(
                {'error': 'Both old_brand and new_brand are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        new_brand = str(new_brand).strip()
        if not BRAND_NAME_REGEX.match(new_brand):
            return Response({'error': 'Invalid brand name.'}, status=status.HTTP_400_BAD_REQUEST)
        brands = BrandService.update_brand(str(old_brand).strip(), new_brand)
        return Response({'status': 'success', 'brands': brands})

    def patch(self, request):
        return self.put(request)

    def delete(self, request):
        brand_name = request.data.get('brand') or request.query_params.get('brand')
        if not brand_name:
            return Response({'error': 'Brand name is required'}, status=status.HTTP_400_BAD_REQUEST)
        brands = BrandService.delete_brand(str(brand_name).strip())
        return Response({'status': 'success', 'brands': brands})


class ProductFacetsView(APIView):
    """GET /api/v1/catalog/facets/ — Filter facets for storefront discovery."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        facets = FacetService.get_facets()
        return Response(facets)


class ProductListView(APIView):
    """
    GET /api/v1/catalog/products/ — Filtered, searchable product catalog.
    POST / PATCH / DELETE — Merchant mutation operations.
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive']

    def get(self, request):
        search_query = request.query_params.get('search', '')
        stock_status = request.query_params.get('stock_status', '')
        brand = request.query_params.get('brand', '')
        status_filter = request.query_params.get('status', '')
        try:
            page = int(request.query_params.get('page', 1))
        except (ValueError, TypeError):
            page = 1
        try:
            page_size = int(request.query_params.get('page_size', 50))
        except (ValueError, TypeError):
            page_size = 50
        paginate = request.query_params.get('paginate', 'false').lower() == 'true'

        is_merchant = (
            request.user and request.user.is_authenticated and any(
                role in ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive']
                for role in request.user.roles.values_list('role__name', flat=True)
            )
        )

        data = CatalogService.get_products(
            search_query=search_query,
            stock_status=stock_status,
            brand=brand,
            status_filter=status_filter,
            page=page,
            page_size=page_size,
            paginate=paginate,
            is_merchant=is_merchant,
            request=request
        )
        return Response(data)

    def post(self, request):
        product, synced = CatalogService.create_product(
            data=request.data,
            files=request.FILES,
            user=request.user if request.user and request.user.is_authenticated else None,
            request=request
        )
        return Response({
            "success": True,
            "message": "Product saved successfully.",
            "collections_synced": synced,
            "id": str(product.id),
            "slug": product.slug
        }, status=status.HTTP_201_CREATED)

    def patch(self, request):
        slugs = request.data.get('slugs', [])
        success, message, count = CatalogService.bulk_patch_products(
            slugs=slugs,
            patch_data=request.data,
            user=request.user,
            request=request
        )
        if not success:
            return Response({'detail': message}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': message})

    def delete(self, request):
        slugs = request.data.get('slugs', [])
        if not slugs:
            return Response({'detail': 'No products selected.'}, status=status.HTTP_400_BAD_REQUEST)
        count = CatalogService.bulk_delete_products(slugs, user=request.user, request=request)
        return Response({'detail': f'Successfully deleted {count} products.'})


class ProductDetailView(APIView):
    """GET / PUT / DELETE /api/v1/catalog/products/<slug>/"""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive']

    def get(self, request, slug: str):
        is_merchant = (
            request.user and request.user.is_authenticated and any(
                role in ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive']
                for role in request.user.roles.values_list('role__name', flat=True)
            )
        )
        data = CatalogService.get_product_by_slug(slug, request=request, is_merchant=is_merchant)
        if not data:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)

    def put(self, request, slug: str):
        product, synced = CatalogService.update_product(
            slug=slug,
            data=request.data,
            files=request.FILES,
            user=request.user if request.user and request.user.is_authenticated else None,
            request=request
        )
        if not product:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "success": True,
            "message": "Product saved successfully.",
            "collections_synced": synced
        })

    def delete(self, request, slug: str):
        success = CatalogService.delete_product(slug, user=request.user, request=request)
        if not success:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'detail': 'Product deleted successfully.'})


class ProductRecommendationVectorView(APIView):
    """GET /api/v1/catalog/products/<slug>/recommendations/ — Scent-based fragrance similarity."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug: str):
        recommendations = RecommendationService.get_recommendations(slug, limit=6, request=request)
        if not recommendations:
            from apps.shop.models import Product
            if not Product.objects.filter(slug=slug, is_online=True).exists():
                return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(recommendations)
