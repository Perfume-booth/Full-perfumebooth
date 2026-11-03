# pyrefly: ignore [parse-error]
"""
Authentication Views — JWT token endpoints & RBAC permission class
"""
# pyrefly: ignore [missing-import, parse-error]
import random
import logging
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.core.mail import send_mail
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

from .models import CustomUser, Role, UserRole, AuditLog
from core.throttling import AuthRateThrottle


class HasRolePermission(permissions.BasePermission):
    """
    Custom DRF permission class for role-based access control.
    """

    def has_permission(self, request, view) -> bool:
        if not request.user or not getattr(request.user, 'is_authenticated', False) or not getattr(request.user, 'is_active', False):
            return False

        allowed_roles = getattr(view, 'allowed_roles', [])
        if not allowed_roles:
            return False  # Misconfigured role-protected endpoints fail closed.

        user_roles = request.user.roles.values_list('role__name', flat=True)
        return any(role in allowed_roles for role in user_roles)


class GetCSRFTokenView(APIView):
    """
    GET /api/auth/csrf/ — Sets the CSRF cookie for frontend cross-origin requests.
    """
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({'detail': 'CSRF cookie set.'})


class LoginView(APIView):
    """
    POST /api/auth/login/ — Authenticate credentials and initiate Django session.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        user_roles = list(user.roles.values_list('role__name', flat=True))
        if not user_roles:
            return Response({'detail': 'Access denied. Account has no merchant role.'}, status=status.HTTP_403_FORBIDDEN)

        login(request, user)

        return Response({
            'id': str(user.id),
            'email': user.email,
            'full_name': user.full_name,
            'roles': user_roles,
            'date_joined': user.date_joined,
        })


from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication


class LogoutView(APIView):
    """
    POST /api/auth/logout/ — Invalidate session and clear session cookies.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_key = getattr(request.session, 'session_key', None)
        if hasattr(request, 'session'):
            request.session.flush()
        logout(request)
        if session_key:
            from django.contrib.sessions.models import Session
            Session.objects.filter(session_key=session_key).delete()
        response = Response({'detail': 'Successfully logged out.'})
        response.delete_cookie('sessionid')
        return response


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
        users = (
            CustomUser.objects.filter(Q(is_staff=True) | Q(roles__isnull=False))
            .exclude(email='superadmin@perfumebooth.com')
            .prefetch_related('roles__role')
            .distinct()
        )
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
            user = CustomUser.objects.filter(Q(is_staff=True) | Q(roles__isnull=False)).distinct().get(id=pk)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.email == 'superadmin@perfumebooth.com':
            return Response({'detail': 'Cannot delete the primary Super Admin account.'}, status=status.HTTP_400_BAD_REQUEST)

        user.delete()
        return Response({'detail': 'Staff member deleted successfully.'})

    def put(self, request, pk: str):
        try:
            user = CustomUser.objects.filter(Q(is_staff=True) | Q(roles__isnull=False)).distinct().get(id=pk)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.email == 'superadmin@perfumebooth.com':
            return Response({'detail': 'Cannot modify the primary Super Admin account.'}, status=status.HTTP_400_BAD_REQUEST)

        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        role_name = request.data.get('role')
        new_email = request.data.get('email')
        otp = request.data.get('otp')

        # If email is being changed, require OTP authorization
        if new_email and new_email.strip().lower() != user.email.lower():
            new_email = new_email.strip().lower()
            target_email = getattr(settings, 'STAFF_SECURITY_EMAIL', 'admin@perfumebooth.com')
            if not otp:
                return Response({'detail': f'Two-factor authorization code (OTP) sent to {target_email} is required to change staff email.'}, status=status.HTTP_400_BAD_REQUEST)

            cached_otp = cache.get("staff_password_change_otp")
            if not cached_otp or str(cached_otp).strip() != str(otp).strip():
                return Response({'detail': 'Invalid or expired authorization code (OTP).'}, status=status.HTTP_400_BAD_REQUEST)

            if CustomUser.objects.filter(email=new_email).exclude(id=user.id).exists():
                return Response({'detail': f'A user with email "{new_email}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

            old_email = user.email
            user.email = new_email
            cache.delete("staff_password_change_otp")

            AuditLog.objects.create(
                user=request.user,
                action=f"Changed email for staff member from {old_email} to {new_email} with 2FA OTP verified via {target_email}.",
                ip_address=request.META.get('REMOTE_ADDR', '')
            )

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        user.save()

        if role_name:
            try:
                role = Role.objects.get(name=role_name)
                # clear existing roles and set the new one
                UserRole.objects.filter(user=user).delete()
                UserRole.objects.create(user=user, role=role)
            except Role.DoesNotExist:
                return Response({'detail': f'Role "{role_name}" does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'roles': list(user.roles.values_list('role__name', flat=True)),
            'detail': 'Staff member updated successfully.'
        })





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


class SendStaffPasswordOTPView(APIView):
    """
    POST /api/auth/staff/send-password-otp/
    Generates and sends a 6-digit OTP code to the staff security email (STAFF_SECURITY_EMAIL, default admin@perfumebooth.com)
    to authorize staff credentials (password or email) changes.
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin']
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        target_email = getattr(settings, 'STAFF_SECURITY_EMAIL', 'admin@perfumebooth.com')
        code = f"{random.randint(100000, 999999)}"

        # Store in cache for 15 minutes
        cache.set("staff_password_change_otp", code, timeout=900)

        subject = "[PerfumeBooth Security] Authorization Code for Staff Credentials Change"
        message = (
            f"A request has been initiated to modify staff credentials in the PerfumeBooth Merchant Portal.\n\n"
            f"Your authorization code (OTP) is: {code}\n\n"
            f"This code is valid for 15 minutes. If you did not authorize this action, please investigate immediately."
        )
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e8e8e8; border-radius: 12px; color: #1a1a1a;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #5B0612; font-size: 22px; font-weight: bold; letter-spacing: 2px; margin: 0 0 6px 0;">PERFUMEBOOTH</h1>
                <p style="color: #B8924A; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0;">Staff Security Authorization</p>
            </div>
            <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello Security Team,</p>
            <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">An administrative request was initiated by <strong>{request.user.email}</strong> to authorize staff credentials or password modification in the Merchant Portal.</p>
            <div style="background: #fdfaf3; border: 1.5px dashed #B8924A; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #5B0612; font-family: monospace;">{code}</span>
                <p style="margin: 6px 0 0 0; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Valid for 15 minutes</p>
            </div>
            <p style="font-size: 12px; color: #666; margin: 24px 0 12px 0;">If you did not initiate or authorize this request, please review your active Super Admin sessions immediately.</p>
        </div>
        """

        smtp_error = None
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'PerfumeBooth <onboarding@resend.dev>'),
                recipient_list=[target_email],
                html_message=html_message,
                fail_silently=False
            )
            logger.info("Staff credentials OTP dispatched to %s", target_email)
        except Exception as e:
            smtp_error = str(e)
            logger.warning("Staff credentials OTP email delivery failed (%s): %s", type(e).__name__, e)

        resp_data = {
            'detail': f'Authorization code sent to {target_email}.',
            'target_email': target_email,
            'otp_sent': True,
        }
        if smtp_error and getattr(settings, 'DEBUG', False):
            resp_data['dev_otp'] = code
            resp_data['smtp_warning'] = smtp_error

        return Response(resp_data)


class ChangePasswordSelfView(APIView):
    """
    POST /api/auth/change-password-self/ — Change own password (Super Admin only).
    Requires two-factor authorization OTP sent to STAFF_SECURITY_EMAIL (admin@perfumebooth.com).
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin']

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        otp = request.data.get('otp')
        target_email = getattr(settings, 'STAFF_SECURITY_EMAIL', 'admin@perfumebooth.com')

        if not old_password or not new_password:
            return Response({'detail': 'Both old and new passwords are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not otp:
            return Response({'detail': f'Security authorization code (OTP) sent to {target_email} is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cached_otp = cache.get("staff_password_change_otp")
        if not cached_otp or str(cached_otp).strip() != str(otp).strip():
            return Response({'detail': 'Invalid or expired authorization code (OTP).'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({'detail': 'Invalid old password.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        cache.delete("staff_password_change_otp")

        # Log action
        AuditLog.objects.create(
            user=user,
            action=f"Changed their own password with 2FA OTP verified via {target_email}.",
            ip_address=request.META.get('REMOTE_ADDR', '')
        )

        return Response({'detail': 'Password updated successfully.'})


class ResetStaffPasswordView(APIView):
    """
    POST /api/auth/reset-staff-password/ — Reset password of a staff member (Super Admin only).
    Requires two-factor authorization OTP sent to STAFF_SECURITY_EMAIL (admin@perfumebooth.com).
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin']

    def post(self, request):
        user_id = request.data.get('user_id')
        new_password = request.data.get('new_password')
        otp = request.data.get('otp')
        target_email = getattr(settings, 'STAFF_SECURITY_EMAIL', 'admin@perfumebooth.com')

        if not user_id or not new_password:
            return Response({'detail': 'User ID and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not otp:
            return Response({'detail': f'Security authorization code (OTP) sent to {target_email} is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cached_otp = cache.get("staff_password_change_otp")
        if not cached_otp or str(cached_otp).strip() != str(otp).strip():
            return Response({'detail': 'Invalid or expired authorization code (OTP).'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            staff_user = CustomUser.objects.filter(Q(is_staff=True) | Q(roles__isnull=False)).distinct().get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        if staff_user.email == 'superadmin@perfumebooth.com':
            return Response({'detail': 'Cannot reset primary Super Admin password via this endpoint.'}, status=status.HTTP_400_BAD_REQUEST)

        staff_user.set_password(new_password)
        staff_user.save()
        cache.delete("staff_password_change_otp")

        # Log action
        AuditLog.objects.create(
            user=request.user,
            action=f"Reset password for staff member: {staff_user.email} with 2FA OTP verified via {target_email}.",
            ip_address=request.META.get('REMOTE_ADDR', '')
        )

        return Response({'detail': f'Password for {staff_user.email} reset successfully.'})


