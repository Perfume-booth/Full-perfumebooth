from django.urls import path
from .views import ProductListView, ProductDetailView, DashboardAnalyticsView

urlpatterns = [
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
]
