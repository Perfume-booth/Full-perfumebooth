from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from .views import MeView, StaffManagementView, StaffDetailView, StaffAuditLogView

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token-obtain'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token-blacklist'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('staff/', StaffManagementView.as_view(), name='staff-management'),
    path('staff/logs/', StaffAuditLogView.as_view(), name='staff-logs'),
    path('staff/<uuid:pk>/', StaffDetailView.as_view(), name='staff-detail'),
]

