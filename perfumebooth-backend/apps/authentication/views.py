"""
Authentication Views — JWT token endpoints & RBAC permission class
"""
# pyrefly: ignore [missing-import]
from rest_framework import permissions, status
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import CustomUser, Role, UserRole, AuditLog


class HasRolePermission(permissions.BasePermission):
    """
    Custom DRF permission class for role-based access control.
    """

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        allowed_roles = getattr(view, 'allowed_roles', [])
        if not allowed_roles:
            return True  # No role restriction on this view

        user_roles = request.user.roles.values_list('role__name', flat=True)
        return any(role in allowed_roles for role in user_roles)


class MeView(APIView):
    """Return the authenticated user's profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': str(user.id),
            'email': user.email,
            'full_name': user.full_name,
            'roles': list(user.roles.values_list('role__name', flat=True)),
            'date_joined': user.date_joined,
        })


class StaffManagementView(APIView):
    """
    GET /api/auth/staff/ — List all staff members (Super Admin only).
    POST /api/auth/staff/ — Create a new staff member and assign their role (Super Admin only).
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin']

    def get(self, request):
        users = CustomUser.objects.exclude(email='superadmin@perfumebooth.com').prefetch_related('roles__role')
        data = []
        for user in users:
            data.append({
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'roles': list(user.roles.values_list('role__name', flat=True)),
                'is_active': user.is_active,
                'date_joined': user.date_joined,
            })
        return Response(data)

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        role_name = request.data.get('role')

        if not email or not password or not role_name:
            return Response({'detail': 'Email, password, and role are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if CustomUser.objects.filter(email=email).exists():
            return Response({'detail': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            role = Role.objects.get(name=role_name)
        except Role.DoesNotExist:
            return Response({'detail': f'Role "{role_name}" does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=True
        )

        UserRole.objects.create(user=user, role=role)

        return Response({
            'id': str(user.id),
            'email': user.email,
            'detail': 'Staff member created successfully.'
        }, status=status.HTTP_201_CREATED)


class StaffDetailView(APIView):
    """
    DELETE /api/auth/staff/<uuid:pk>/ — Delete a staff member (Super Admin only).
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin']

    def delete(self, request, pk: str):
        try:
            user = CustomUser.objects.get(id=pk)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.email == 'superadmin@perfumebooth.com':
            return Response({'detail': 'Cannot delete the primary Super Admin account.'}, status=status.HTTP_400_BAD_REQUEST)

        user.delete()
        return Response({'detail': 'Staff member deleted successfully.'})


class StaffAuditLogView(APIView):
    """
    GET /api/auth/staff/logs/ — List all staff audit logs (Super Admin only).
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin']

    def get(self, request):
        logs = AuditLog.objects.select_related('user').order_by('-created_at')[:100]
        data = []
        for log in logs:
            data.append({
                'id': str(log.id),
                'staff_name': log.user.full_name or log.user.email,
                'action': log.action,
                'ip_address': log.ip_address,
                'created_at': log.created_at,
            })
        return Response(data)


