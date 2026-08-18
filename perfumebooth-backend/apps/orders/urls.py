from django.urls import path
from .views import OrderListView, OrderDetailView, RazorpayWebhookView, ShippingRatesAPIView, ShiprocketWebhookView

urlpatterns = [
    path('', OrderListView.as_view(), name='order-list'),
    path('<uuid:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('shipping-rates/', ShippingRatesAPIView.as_view(), name='shipping-rates'),
    path('shiprocket/webhook/', ShiprocketWebhookView.as_view(), name='shiprocket-webhook'),
    path('webhooks/razorpay/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
]
