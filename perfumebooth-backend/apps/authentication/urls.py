# pyrefly: ignore [missing-import]
from django.urls import path
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

urlpatterns = [
    path('csrf/', GetCSRFTokenView.as_view(), name='auth-csrf'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('staff/', StaffManagementView.as_view(), name='staff-management'),
    path('staff/logs/', StaffAuditLogView.as_view(), name='staff-logs'),
    path('staff/<uuid:pk>/', StaffDetailView.as_view(), name='staff-detail'),
    path('change-password-self/', ChangePasswordSelfView.as_view(), name='change-password-self'),
    path('reset-staff-password/', ResetStaffPasswordView.as_view(), name='reset-staff-password'),
]

