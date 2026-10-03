from django.urls import path
from .views import (
    OrderListView, OrderDetailView, RazorpayWebhookView, ShippingRatesAPIView, 
    ShiprocketWebhookView, AbandonedCartAPIView, AbandonedCartRecoverView,
    CouponValidationView
)

urlpatterns = [
    path('', OrderListView.as_view(), name='order-list'),
    path('<uuid:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('shipping-rates/', ShippingRatesAPIView.as_view(), name='shipping-rates'),
    path('validate-coupon/', CouponValidationView.as_view(), name='validate-coupon'),
    path('shiprocket/webhook/', ShiprocketWebhookView.as_view(), name='shiprocket-webhook'),
    path('webhooks/razorpay/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
    path('abandoned-cart/', AbandonedCartAPIView.as_view(), name='abandoned-cart'),
    path('abandoned-cart/recover/<str:token>/', AbandonedCartRecoverView.as_view(), name='abandoned-cart-recover'),
]

