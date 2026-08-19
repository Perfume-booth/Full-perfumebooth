# pyrefly: ignore [missing-import]
from django.urls import path
from .views import (
    ProductListView, ProductDetailView, DashboardAnalyticsView, AnalyticsAPIView, BrandListView, 
    ProductFacetsView, CollectionListCreateView, CollectionDetailView,
    ProductExcelExportView, ProductExcelImportView, PageBannerDetailView,
    PageBannerListCreateView, PageBannerDeleteView, PageBannerImageDeleteView,
    WishlistAPIView, WishlistDeleteView, CartValidationAPIView, ProductReviewAPIView,
    ProductRecommendationVectorView
)

urlpatterns = [
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/excel-export/', ProductExcelExportView.as_view(), name='product-excel-export'),
    path('products/excel-import/', ProductExcelImportView.as_view(), name='product-excel-import'),
    path('products/<slug:slug>/recommendations/', ProductRecommendationVectorView.as_view(), name='product-recommendations'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<uuid:product_id>/reviews/', ProductReviewAPIView.as_view(), name='product-reviews'),
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('analytics/', AnalyticsAPIView.as_view(), name='shop-analytics'),
    path('brands/', BrandListView.as_view(), name='brand-list'),
    path('facets/', ProductFacetsView.as_view(), name='product-facets'),
    path('collections/', CollectionListCreateView.as_view(), name='collection-list'),
    path('collections/<path:slug>/', CollectionDetailView.as_view(), name='collection-detail'),
    path('banners/', PageBannerListCreateView.as_view(), name='banner-list-create'),
    path('banners/delete/<uuid:id>/', PageBannerDeleteView.as_view(), name='banner-delete'),
    path('banners/image/delete/<uuid:id>/', PageBannerImageDeleteView.as_view(), name='banner-image-delete'),
    path('banners/<path:slug>/', PageBannerDetailView.as_view(), name='banner-detail'),
    path('wishlist/', WishlistAPIView.as_view(), name='wishlist'),
    path('wishlist/<uuid:product_id>/', WishlistDeleteView.as_view(), name='wishlist-delete'),
    path('cart/validate/', CartValidationAPIView.as_view(), name='cart-validate'),
]

