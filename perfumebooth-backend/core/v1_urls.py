"""
Versioned API (v1) URL Configuration
Routes:
  /api/v1/catalog/
  /api/v1/cart/
  /api/v1/checkout/
  /api/v1/orders/
  /api/v1/admin/
"""
from django.urls import path, include

# Catalog Views (Extracted Domain)
from apps.catalog.views import (
    ProductListView, ProductDetailView, BrandListView, ProductFacetsView,
    ProductRecommendationVectorView
)

# Shop Views (Collections, Banners, Reviews, Analytics, Wishlist)
from apps.shop.views import (
    CollectionListCreateView, CollectionDetailView, PageBannerListCreateView,
    PageBannerDetailView, PageBannerDeleteView, PageBannerImageDeleteView,
    WishlistAPIView, WishlistDeleteView, CartValidationAPIView,
    ProductReviewAPIView,
    ProductExcelExportView, ProductExcelImportView, ProductExcelImportApplyView,
    ProductExcelImportErrorsView, ProductExcelImportTemplateView,
    AnalyticsAPIView, DashboardAnalyticsView
)

# Orders & Checkout Views
from apps.orders.views import (
    OrderListView, OrderDetailView, CouponValidationView,
    ShippingRatesAPIView, RazorpayWebhookView, ShiprocketWebhookView,
    AbandonedCartAPIView, AbandonedCartRecoverView
)

# Checkout Views
from apps.checkout.views import CheckoutView

# Authentication & Staff Views
from apps.authentication.views import (
    StaffManagementView, StaffDetailView, StaffAuditLogView
)

# CMS Views
from apps.cms.views import (
    CMSPageListView, CMSPageView, BlogPostListView, BlogPostDetailView
)

catalog_patterns = [
    path('products/', ProductListView.as_view(), name='v1-catalog-products'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='v1-catalog-product-detail'),
    path('products/<slug:slug>/recommendations/', ProductRecommendationVectorView.as_view(), name='v1-catalog-product-recommendations'),
    path('products/<uuid:product_id>/reviews/', ProductReviewAPIView.as_view(), name='v1-catalog-product-reviews'),
    path('collections/', CollectionListCreateView.as_view(), name='v1-catalog-collections'),
    path('collections/<path:slug>/', CollectionDetailView.as_view(), name='v1-catalog-collection-detail'),
    path('brands/', BrandListView.as_view(), name='v1-catalog-brands'),
    path('facets/', ProductFacetsView.as_view(), name='v1-catalog-facets'),
    path('banners/', PageBannerListCreateView.as_view(), name='v1-catalog-banners'),
    path('banners/<path:slug>/', PageBannerDetailView.as_view(), name='v1-catalog-banner-detail'),
]

cart_patterns = [
    path('validate/', CartValidationAPIView.as_view(), name='v1-cart-validate'),
    path('coupon/', CouponValidationView.as_view(), name='v1-cart-coupon'),
    path('abandoned/', AbandonedCartAPIView.as_view(), name='v1-cart-abandoned'),
    path('abandoned/recover/<str:token>/', AbandonedCartRecoverView.as_view(), name='v1-cart-abandoned-recover'),
    path('wishlist/', WishlistAPIView.as_view(), name='v1-cart-wishlist'),
    path('wishlist/<uuid:product_id>/', WishlistDeleteView.as_view(), name='v1-cart-wishlist-delete'),
]

checkout_patterns = [
    path('', CheckoutView.as_view(), name='v1-checkout-order-create'),
    path('shipping-rates/', ShippingRatesAPIView.as_view(), name='v1-checkout-shipping-rates'),
    path('webhooks/razorpay/', RazorpayWebhookView.as_view(), name='v1-checkout-razorpay-webhook'),
    path('webhooks/shiprocket/', ShiprocketWebhookView.as_view(), name='v1-checkout-shiprocket-webhook'),
]

orders_patterns = [
    path('', OrderListView.as_view(), name='v1-order-list'),
    path('<path:pk>/', OrderDetailView.as_view(), name='v1-order-detail'),
]

admin_patterns = [
    path('products/', ProductListView.as_view(), name='v1-admin-products'),
    path('products/excel-export/', ProductExcelExportView.as_view(), name='v1-admin-products-excel-export'),
    path('products/excel-import/', ProductExcelImportView.as_view(), name='v1-admin-products-excel-import'),
    path('products/excel-import/template/', ProductExcelImportTemplateView.as_view(), name='v1-admin-products-excel-import-template'),
    path('products/excel-import/<uuid:job_id>/apply/', ProductExcelImportApplyView.as_view(), name='v1-admin-products-excel-import-apply'),
    path('products/excel-import/<uuid:job_id>/errors/', ProductExcelImportErrorsView.as_view(), name='v1-admin-products-excel-import-errors'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='v1-admin-product-detail'),
    path('collections/', CollectionListCreateView.as_view(), name='v1-admin-collections'),
    path('collections/<path:slug>/', CollectionDetailView.as_view(), name='v1-admin-collection-detail'),
    path('banners/', PageBannerListCreateView.as_view(), name='v1-admin-banners'),
    path('banners/delete/<uuid:id>/', PageBannerDeleteView.as_view(), name='v1-admin-banner-delete'),
    path('banners/image/delete/<uuid:id>/', PageBannerImageDeleteView.as_view(), name='v1-admin-banner-image-delete'),
    path('banners/<path:slug>/', PageBannerDetailView.as_view(), name='v1-admin-banner-detail'),
    path('analytics/', AnalyticsAPIView.as_view(), name='v1-admin-analytics'),
    path('dashboard/', DashboardAnalyticsView.as_view(), name='v1-admin-dashboard'),
    path('staff/', StaffManagementView.as_view(), name='v1-admin-staff-list'),
    path('staff/<path:pk>/', StaffDetailView.as_view(), name='v1-admin-staff-detail'),
    path('staff/logs/', StaffAuditLogView.as_view(), name='v1-admin-staff-logs'),
    path('cms/pages/', CMSPageListView.as_view(), name='v1-admin-cms-pages'),
    path('cms/pages/<path:slug>/', CMSPageView.as_view(), name='v1-admin-cms-page-detail'),
    path('cms/blogs/', BlogPostListView.as_view(), name='v1-admin-cms-blogs'),
    path('cms/blogs/<path:slug_or_id>/', BlogPostDetailView.as_view(), name='v1-admin-cms-blog-detail'),
]

urlpatterns = [
    path('catalog/', include(catalog_patterns)),
    path('cart/', include(cart_patterns)),
    path('checkout/', include(checkout_patterns)),
    path('orders/', include(orders_patterns)),
    path('admin/', include(admin_patterns)),
]
