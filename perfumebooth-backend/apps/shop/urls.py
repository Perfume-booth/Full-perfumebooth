# pyrefly: ignore [missing-import]
from django.urls import path
from .views import (
    ProductListView, ProductDetailView, DashboardAnalyticsView, BrandListView, 
    ProductFacetsView, CollectionListCreateView, CollectionDetailView,
    ProductExcelExportView, ProductExcelImportView, PageBannerDetailView,
    PageBannerListCreateView, PageBannerDeleteView, PageBannerImageDeleteView
)

urlpatterns = [
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/excel-export/', ProductExcelExportView.as_view(), name='product-excel-export'),
    path('products/excel-import/', ProductExcelImportView.as_view(), name='product-excel-import'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('brands/', BrandListView.as_view(), name='brand-list'),
    path('facets/', ProductFacetsView.as_view(), name='product-facets'),
    path('collections/', CollectionListCreateView.as_view(), name='collection-list'),
    path('collections/<path:slug>/', CollectionDetailView.as_view(), name='collection-detail'),
    path('banners/', PageBannerListCreateView.as_view(), name='banner-list-create'),
    path('banners/delete/<uuid:id>/', PageBannerDeleteView.as_view(), name='banner-delete'),
    path('banners/image/delete/<uuid:id>/', PageBannerImageDeleteView.as_view(), name='banner-image-delete'),
    path('banners/<path:slug>/', PageBannerDetailView.as_view(), name='banner-detail'),
]

