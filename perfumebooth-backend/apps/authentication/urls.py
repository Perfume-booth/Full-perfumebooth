# pyrefly: ignore [missing-import]
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    MeView, 
    StaffManagementView, 
    StaffDetailView, 
    StaffAuditLogView, 
    ChangePasswordSelfView, 
    ResetStaffPasswordView,
    LoginView,
    LogoutView,
    GetCSRFTokenView
)
from .customer_views import (
    CustomerRegisterView,
    CustomerLoginView,
    CustomerSendOTPView,
    CustomerVerifyOTPView,
    CustomerSocialAuthView,
    CustomerMeView,
    CustomerAddressListView,
    CustomerAddressDetailView,
    CustomerAddressSetDefaultView
)
from .customer_management_views import (
    MerchantCustomerListView,
    MerchantCustomerDetailView,
    MerchantCustomerToggleStatusView
)

urlpatterns = [
    path('csrf/', GetCSRFTokenView.as_view(), name='auth-csrf'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('staff/', StaffManagementView.as_view(), name='staff-management'),
    path('staff/logs/', StaffAuditLogView.as_view(), name='staff-logs'),
    path('staff/<uuid:pk>/', StaffDetailView.as_view(), name='staff-detail'),
    path('change-password-self/', ChangePasswordSelfView.as_view(), name='change-password-self'),
    path('reset-staff-password/', ResetStaffPasswordView.as_view(), name='reset-staff-password'),

    # Customer auth & address endpoints
    path('customer/register/', CustomerRegisterView.as_view(), name='customer-register'),
    path('customer/login/', CustomerLoginView.as_view(), name='customer-login'),
    path('customer/otp/send/', CustomerSendOTPView.as_view(), name='customer-otp-send'),
    path('customer/otp/verify/', CustomerVerifyOTPView.as_view(), name='customer-otp-verify'),
    path('customer/social/', CustomerSocialAuthView.as_view(), name='customer-social-auth'),
    path('customer/me/', CustomerMeView.as_view(), name='customer-me'),
    path('customer/addresses/', CustomerAddressListView.as_view(), name='customer-address-list'),
    path('customer/addresses/<uuid:pk>/', CustomerAddressDetailView.as_view(), name='customer-address-detail'),
    path('customer/addresses/<uuid:pk>/set-default/', CustomerAddressSetDefaultView.as_view(), name='customer-address-set-default'),

    # Merchant Customer Management endpoints
    path('merchant/customers/', MerchantCustomerListView.as_view(), name='merchant-customer-list'),
    path('merchant/customers/<uuid:pk>/', MerchantCustomerDetailView.as_view(), name='merchant-customer-detail'),
    path('merchant/customers/<uuid:pk>/toggle-status/', MerchantCustomerToggleStatusView.as_view(), name='merchant-customer-toggle-status'),
]


