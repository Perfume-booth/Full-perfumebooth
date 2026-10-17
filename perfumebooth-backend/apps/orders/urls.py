from django.urls import path
from .views import (
    OrderListView, OrderDetailView, OrderCancelView, RazorpayWebhookView, ShippingRatesAPIView, 
    ShiprocketWebhookView, AbandonedCartAPIView, AbandonedCartRecoverView,
    CouponValidationView,
    MerchantCouponListView,
    MerchantCouponDetailView,
    MerchantCouponToggleStatusView,
    MerchantCouponBulkGenerateView,
    MerchantPromotionListView,
    MerchantPromotionDetailView,
    MerchantPromotionToggleStatusView,
    PublicActivePromotionsView,
)

urlpatterns = [
    path('', OrderListView.as_view(), name='order-list'),
    path('<uuid:pk>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<uuid:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('shipping-rates/', ShippingRatesAPIView.as_view(), name='shipping-rates'),
    path('validate-coupon/', CouponValidationView.as_view(), name='validate-coupon'),
    path('promotions/active/', PublicActivePromotionsView.as_view(), name='public-promotions-active'),
    path('merchant/coupons/', MerchantCouponListView.as_view(), name='merchant-coupon-list'),
    path('merchant/coupons/bulk-generate/', MerchantCouponBulkGenerateView.as_view(), name='merchant-coupon-bulk-generate'),
    path('merchant/coupons/<uuid:pk>/', MerchantCouponDetailView.as_view(), name='merchant-coupon-detail'),
    path('merchant/coupons/<uuid:pk>/toggle/', MerchantCouponToggleStatusView.as_view(), name='merchant-coupon-toggle'),
    path('merchant/promotions/', MerchantPromotionListView.as_view(), name='merchant-promotion-list'),
    path('merchant/promotions/<uuid:pk>/', MerchantPromotionDetailView.as_view(), name='merchant-promotion-detail'),
    path('merchant/promotions/<uuid:pk>/toggle/', MerchantPromotionToggleStatusView.as_view(), name='merchant-promotion-toggle'),
    path('shiprocket/webhook/', ShiprocketWebhookView.as_view(), name='shiprocket-webhook'),
    path('webhooks/razorpay/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
    path('abandoned-cart/', AbandonedCartAPIView.as_view(), name='abandoned-cart'),
    path('abandoned-cart/recover/<str:token>/', AbandonedCartRecoverView.as_view(), name='abandoned-cart-recover'),
]
