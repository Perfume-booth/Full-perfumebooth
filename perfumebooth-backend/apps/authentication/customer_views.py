import random
import secrets
import re
import logging
from datetime import datetime, timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import requests
import jwt

from .models import CustomUser, OTPVerification, SocialAccount, CustomerAddress
from core.circuit_breaker import CircuitBreaker, CircuitBreakerOpenException
from core.throttling import AuthRateThrottle, OTPRateThrottle
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

# Initialize circuit breakers for Google and Facebook OAuth endpoints
google_breaker = CircuitBreaker(name="GoogleOAuth", failure_threshold=3, recovery_timeout=15.0)
facebook_breaker = CircuitBreaker(name="FacebookOAuth", failure_threshold=3, recovery_timeout=15.0)
PINCODE_REGEX = re.compile(r'^\d{6}$')


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class CustomerRegisterView(APIView):
    """
    POST /api/auth/customer/register/
    Register a customer using Email + Password.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        phone = request.data.get('phone')

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if CustomUser.objects.filter(email=email).exists():
            return Response({'detail': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if phone and CustomUser.objects.filter(phone=phone).exists():
            return Response({'detail': 'A user with this phone number already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.create_user(
            email=email,
            phone=phone,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=False
        )

        # Send welcome email asynchronously / fail-safe
        try:
            name_display = user.first_name or "Valued Customer"
            subject = "Welcome to PerfumeBooth"
            message = (
                f"Hello {name_display},\n\n"
                f"Welcome to PerfumeBooth! Your account has been successfully created.\n"
                f"Discover our curated selection of luxury fragrances, discovery sets, and exclusive member privileges.\n\n"
                f"Best regards,\nThe PerfumeBooth Team"
            )
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
                <h2 style="color: #5B0612;">Welcome to PerfumeBooth</h2>
                <p>Hello {name_display},</p>
                <p>Thank you for creating an account with us. We are delighted to accompany you on your fragrance journey.</p>
                <p>Explore our curated catalog of authentic international designer perfumes, luxury discovery boxes, and bespoke scents.</p>
                <p style="margin: 25px 0;">
                    <a href="https://perfumebooth.com/products" style="background-color: #5B0612; color: #ffffff; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Start Exploring</a>
                </p>
                <p style="font-size: 12px; color: #999; margin-top: 30px;">If you have any questions or need recommendations, our specialists are available at online@beverly-in.com.</p>
            </div>
            """
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'PerfumeBooth <onboarding@resend.dev>'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=True
            )
        except Exception as e:
            logger.warning(f"Could not send welcome email to {user.email}: {e}")

        tokens = get_tokens_for_user(user)
        return Response({
            'user': {
                'id': str(user.id),
                'email': user.email,
                'phone': user.phone,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            **tokens
        }, status=status.HTTP_201_CREATED)


class CustomerLoginView(APIView):
    """
    POST /api/auth/customer/login/
    Login a customer using Email + Password.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'detail': 'Account is disabled.'}, status=status.HTTP_400_BAD_REQUEST)

        tokens = get_tokens_for_user(user)
        return Response({
            'user': {
                'id': str(user.id),
                'email': user.email,
                'phone': user.phone,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            **tokens
        })


class CustomerSendOTPView(APIView):
    """
    POST /api/auth/customer/otp/send/
    Send a 6-digit OTP code to the provided phone number.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        phone = request.data.get('phone')
        if not phone:
            return Response({'detail': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a cryptographically secure 6-digit code
        code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = timezone.now() + timedelta(minutes=5)

        # Create verification record
        OTPVerification.objects.create(
            phone=phone,
            code=code,
            expires_at=expires_at
        )

        if settings.DEBUG:
            logger.debug("OTP generated for phone ending in %s", phone[-4:] if len(phone) >= 4 else phone)

        # In production, integrate your SMS provider here (e.g. Twilio / Fast2SMS)

        return Response({'detail': 'OTP sent successfully.'})


class CustomerVerifyOTPView(APIView):
    """
    POST /api/auth/customer/otp/verify/
    Verify OTP code and authenticate/register the customer.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        phone = request.data.get('phone')
        code = request.data.get('code')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if not phone or not code:
            return Response({'detail': 'Phone number and OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find the latest unverified matching code that hasn't expired
        otp = OTPVerification.objects.filter(
            phone=phone,
            code=code,
            is_verified=False,
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()

        if not otp:
            return Response({'detail': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        otp.is_verified = True
        otp.save()

        # Find or create user
        user, created = CustomUser.objects.get_or_create(
            phone=phone,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'is_staff': False
            }
        )

        tokens = get_tokens_for_user(user)
        return Response({
            'user': {
                'id': str(user.id),
                'email': user.email,
                'phone': user.phone,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'created': created,
            **tokens
        })


class CustomerSocialAuthView(APIView):
    """
    POST /api/auth/customer/social/
    Verify social login token and return JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        provider = request.data.get('provider')
        token = request.data.get('token')

        if not provider or not token:
            return Response({'detail': 'Provider and token are required.'}, status=status.HTTP_400_BAD_REQUEST)

        email = None
        uid = None
        first_name = ''
        last_name = ''

        allow_mock = getattr(settings, 'DEBUG', False) or getattr(settings, 'ALLOW_MOCK_OAUTH', False)

        if provider == 'google':
            if allow_mock and token == 'mock-google-id-token-12345':
                email = 'google.user@example.com'
                uid = 'google-mock-12345'
                first_name = 'Google'
                last_name = 'User'
            else:
                def fetch_google_data():
                    resp = requests.get(f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={token}", timeout=5)
                    if resp.status_code != 200:
                        resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=5)
                    return resp

                try:
                    resp = google_breaker.call(fetch_google_data)
                except CircuitBreakerOpenException:
                    return Response({'detail': 'Google auth service is temporarily offline (circuit breaker tripped). Please try again later.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                except Exception:
                    return Response({'detail': 'Google auth service unavailable or invalid token.'}, status=status.HTTP_400_BAD_REQUEST)

                if resp.status_code != 200:
                    return Response({'detail': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)
                
                data = resp.json()
                email = data.get('email')
                uid = data.get('sub')
                first_name = data.get('given_name', '')
                last_name = data.get('family_name', '')

        elif provider == 'facebook':
            if allow_mock and token == 'mock-facebook-access-token-12345':
                email = 'facebook.user@example.com'
                uid = 'facebook-mock-12345'
                first_name = 'Facebook'
                last_name = 'User'
            else:
                try:
                    resp = facebook_breaker.call(lambda: requests.get(f"https://graph.facebook.com/me?fields=id,name,email&access_token={token}", timeout=5))
                except CircuitBreakerOpenException:
                    return Response({'detail': 'Facebook auth service is temporarily offline (circuit breaker tripped). Please try again later.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                except Exception:
                    return Response({'detail': 'Facebook auth service unavailable or invalid token.'}, status=status.HTTP_400_BAD_REQUEST)

                if resp.status_code != 200:
                    return Response({'detail': 'Invalid Facebook token.'}, status=status.HTTP_400_BAD_REQUEST)
                data = resp.json()
                email = data.get('email')
                uid = data.get('id')
                name = data.get('name', '')
                if name:
                    parts = name.split(' ', 1)
                    first_name = parts[0]
                    last_name = parts[1] if len(parts) > 1 else ''

        else:
            return Response({'detail': f'Provider {provider} not supported.'}, status=status.HTTP_400_BAD_REQUEST)

        if not uid:
            return Response({'detail': 'Could not retrieve user ID from token.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if social account exists
        try:
            social_account = SocialAccount.objects.get(provider=provider, uid=uid)
            user = social_account.user
            if user and (user.is_staff or user.is_superuser):
                return Response(
                    {'detail': 'Staff accounts cannot sign in through customer social authentication.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except SocialAccount.DoesNotExist:
            # Check if user exists with the same email
            user = None
            if email:
                user = CustomUser.objects.filter(email=email).first()
                if user and (user.is_staff or user.is_superuser):
                    return Response(
                        {'detail': 'Staff accounts cannot sign in through customer social authentication.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            if not user:
                # Create a new user
                user = CustomUser.objects.create_user(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    is_staff=False
                )

            # Map social account
            SocialAccount.objects.create(user=user, provider=provider, uid=uid)

        tokens = get_tokens_for_user(user)
        return Response({
            'user': {
                'id': str(user.id),
                'email': user.email,
                'phone': user.phone,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            **tokens
        })


class CustomerMeView(APIView):
    """
    GET /api/auth/customer/me/
    Retrieve authenticated customer's profile info & addresses.
    PUT /api/auth/customer/me/
    Update authenticated customer's profile info.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        addresses = list(user.addresses.values(
            'id', 'first_name', 'last_name', 'address1', 'address2',
            'city', 'province', 'country', 'zip', 'phone', 'is_default'
        ))
        for addr in addresses:
            addr['id'] = str(addr['id'])

        return Response({
            'id': str(user.id),
            'email': user.email,
            'phone': user.phone,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'addresses': addresses,
        })

    def put(self, request):
        user = request.user
        first_name = request.data.get('first_name', request.data.get('firstName'))
        last_name = request.data.get('last_name', request.data.get('lastName'))
        phone = request.data.get('phone')

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if phone is not None:
            user.phone = phone
        user.save()

        return Response({
            'detail': 'Profile updated successfully.',
            'user': {
                'id': str(user.id),
                'email': user.email,
                'phone': user.phone,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })


class CustomerAddressListView(APIView):
    """
    GET /api/auth/customer/addresses/
    POST /api/auth/customer/addresses/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        addresses = list(request.user.addresses.values(
            'id', 'first_name', 'last_name', 'address1', 'address2',
            'city', 'province', 'country', 'zip', 'phone', 'is_default'
        ))
        for addr in addresses:
            addr['id'] = str(addr['id'])
        return Response(addresses)

    def post(self, request):
        user = request.user
        data = request.data

        address1 = str(data.get('address1') or '').strip()
        city = str(data.get('city') or '').strip()
        pincode = str(data.get('zip', data.get('pincode', '')) or '').strip()

        if not address1 or not city or not pincode:
            return Response(
                {'detail': 'Address line 1, city, and PIN code are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not PINCODE_REGEX.match(pincode):
            return Response(
                {'detail': 'Invalid PIN code. Must be a 6-digit postal code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            has_existing = user.addresses.exists()
            is_default = True if not has_existing else bool(data.get('is_default', False))

            if is_default and has_existing:
                user.addresses.update(is_default=False)

            addr = CustomerAddress.objects.create(
                user=user,
                first_name=data.get('first_name', data.get('firstName', '')),
                last_name=data.get('last_name', data.get('lastName', '')),
                address1=address1,
                address2=data.get('address2', ''),
                city=city,
                province=data.get('province', data.get('state', '')),
                country=data.get('country', 'India'),
                zip=pincode,
                phone=data.get('phone', ''),
                is_default=is_default
            )

        return Response({
            'id': str(addr.id),
            'first_name': addr.first_name,
            'last_name': addr.last_name,
            'address1': addr.address1,
            'address2': addr.address2,
            'city': addr.city,
            'province': addr.province,
            'country': addr.country,
            'zip': addr.zip,
            'phone': addr.phone,
            'is_default': addr.is_default,
        }, status=status.HTTP_201_CREATED)


class CustomerAddressDetailView(APIView):
    """
    PUT /api/auth/customer/addresses/<uuid:pk>/
    DELETE /api/auth/customer/addresses/<uuid:pk>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        try:
            addr = CustomerAddress.objects.get(id=pk, user=request.user)
        except CustomerAddress.DoesNotExist:
            return Response({'detail': 'Address not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'address1' in data and not str(data['address1']).strip():
            return Response({'detail': 'Address line 1 cannot be blank.'}, status=status.HTTP_400_BAD_REQUEST)
        if 'city' in data and not str(data['city']).strip():
            return Response({'detail': 'City cannot be blank.'}, status=status.HTTP_400_BAD_REQUEST)
        if 'zip' in data or 'pincode' in data:
            pin = str(data.get('zip', data.get('pincode', ''))).strip()
            if not PINCODE_REGEX.match(pin):
                return Response({'detail': 'Invalid PIN code. Must be a 6-digit postal code.'}, status=status.HTTP_400_BAD_REQUEST)
            addr.zip = pin

        with transaction.atomic():
            if data.get('is_default'):
                request.user.addresses.exclude(id=addr.id).update(is_default=False)
                addr.is_default = True

            addr.first_name = data.get('first_name', data.get('firstName', addr.first_name))
            addr.last_name = data.get('last_name', data.get('lastName', addr.last_name))
            addr.address1 = data.get('address1', addr.address1)
            addr.address2 = data.get('address2', addr.address2)
            addr.city = data.get('city', addr.city)
            addr.province = data.get('province', data.get('state', addr.province))
            addr.country = data.get('country', addr.country)
            addr.phone = data.get('phone', addr.phone)
            addr.save()

        return Response({
            'id': str(addr.id),
            'first_name': addr.first_name,
            'last_name': addr.last_name,
            'address1': addr.address1,
            'address2': addr.address2,
            'city': addr.city,
            'province': addr.province,
            'country': addr.country,
            'zip': addr.zip,
            'phone': addr.phone,
            'is_default': addr.is_default,
        })

    def delete(self, request, pk):
        try:
            addr = CustomerAddress.objects.get(id=pk, user=request.user)
        except CustomerAddress.DoesNotExist:
            return Response({'detail': 'Address not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            was_default = addr.is_default
            addr.delete()
            if was_default:
                remaining = request.user.addresses.order_by('-created_at').first()
                if remaining:
                    remaining.is_default = True
                    remaining.save(update_fields=['is_default'])

        return Response({'detail': 'Address deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)


class CustomerAddressSetDefaultView(APIView):
    """
    POST /api/auth/customer/addresses/<uuid:pk>/set-default/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            addr = CustomerAddress.objects.get(id=pk, user=request.user)
        except CustomerAddress.DoesNotExist:
            return Response({'detail': 'Address not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            request.user.addresses.exclude(id=addr.id).update(is_default=False)
            addr.is_default = True
            addr.save(update_fields=['is_default'])

        return Response({'detail': 'Default address updated successfully.'})


class CustomerPasswordResetRequestView(APIView):
    """
    POST /api/auth/customer/password-reset/
    Send password reset email with secure token.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.filter(email=email, is_active=True).first()
        if user:
            # Generate 6-digit OTP code stored in cache for 15 minutes
            code = f"{secrets.randbelow(900000) + 100000}"
            cache.set(f"pwd_reset_otp:{email}", code, timeout=900)

            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Determine frontend URL with strict origin whitelist validation
            default_frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
            trusted_origins = set(getattr(settings, 'CORS_ALLOWED_ORIGINS', [])) | \
                              set(getattr(settings, 'CSRF_TRUSTED_ORIGINS', [])) | \
                              {default_frontend}
            raw_url = request.data.get('frontend_url') or request.headers.get('Origin') or request.headers.get('Referer')
            frontend_url = default_frontend
            if raw_url:
                from urllib.parse import urlparse
                parsed = urlparse(raw_url)
                if parsed.scheme and parsed.netloc:
                    origin = f"{parsed.scheme}://{parsed.netloc}".rstrip('/')
                    if origin in trusted_origins:
                        frontend_url = origin

            reset_url = f"{frontend_url.rstrip('/')}/account/reset/{uid}/{token}"

            subject = f"Your PerfumeBooth Verification Code: {code}"
            message = f"Hello {user.first_name or 'Valued Customer'},\n\nYour 6-digit verification code to set your password is: {code}\n\nValid for 15 minutes.\n\nOr click here to reset: {reset_url}\n\nIf you did not request this, please ignore this email."
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e8e8e8; border-radius: 12px; color: #1a1a1a;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #5B0612; font-size: 22px; font-weight: bold; letter-spacing: 2px; margin: 0 0 6px 0;">PERFUMEBOOTH</h1>
                    <p style="color: #B8924A; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0;">100% Authentic Luxury Fragrances</p>
                </div>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello {user.first_name or 'Valued Customer'},</p>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Use the 6-digit verification code below to set your password and activate your account:</p>
                <div style="background: #fdfaf3; border: 1.5px dashed #B8924A; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #5B0612; font-family: monospace;">{code}</span>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Valid for 15 minutes</p>
                </div>
                <p style="font-size: 13px; color: #666; margin: 24px 0 12px 0;">Or if you prefer, click the button below to reset your password via direct link:</p>
                <p style="text-align: center; margin: 20px 0;">
                    <a href="{reset_url}" style="background-color: #5B0612; color: #ffffff; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block; letter-spacing: 1px;">Set New Password</a>
                </p>
                <p style="font-size: 11px; color: #999; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">If you did not request this verification, you can safely ignore this email.</p>
            </div>
            """

            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'PerfumeBooth <onboarding@resend.dev>'),
                    recipient_list=[user.email],
                    html_message=html_message,
                    fail_silently=False
                )
            except Exception as e:
                logger.warning(f"Could not send password reset email via SMTP ({e}). Dev Reset Link: {reset_url} Code: {code}")

        return Response({
            'detail': 'A 6-digit verification code has been sent to your email.',
            'email': email,
            'otp_sent': True
        })


class CustomerPasswordResetConfirmView(APIView):
    """
    POST /api/auth/customer/password-reset-confirm/
    Verify OTP or token and update password.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp') or request.data.get('code')
        password = request.data.get('password')

        # 1. In-modal Email OTP flow
        if email and otp and password:
            if len(password) < 8:
                return Response({'detail': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
            cached_code = cache.get(f"pwd_reset_otp:{email}")
            if not cached_code or str(cached_code).strip() != str(otp).strip():
                return Response({'detail': 'Invalid or expired verification code. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

            user = CustomUser.objects.filter(email=email, is_active=True).first()
            if not user:
                return Response({'detail': 'Customer account not found.'}, status=status.HTTP_404_NOT_FOUND)

            user.set_password(password)
            user.save(update_fields=['password'])
            cache.delete(f"pwd_reset_otp:{email}")

            tokens = get_tokens_for_user(user)
            return Response({
                'detail': 'Your password has been successfully set. You are now logged in.',
                'access': tokens['access'],
                'refresh': tokens['refresh']
            })

        # 2. Direct URL reset link fallback
        uid = request.data.get('uid') or request.data.get('id')
        token = request.data.get('token')
        password = request.data.get('password')

        if not uid or not token or not password:
            return Response({'detail': 'ID, token, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        user = None
        # Try decoding urlsafe base64 uid first, then fallback to raw UUID
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = CustomUser.objects.filter(pk=user_id).first()
        except Exception:
            pass

        if not user:
            try:
                user = CustomUser.objects.filter(pk=uid).first()
            except Exception:
                pass

        if not user or not default_token_generator.check_token(user, token):
            return Response({'detail': 'Invalid or expired password reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

        return Response({'detail': 'Your password has been successfully reset. You can now sign in.'})


class CustomerChangePasswordView(APIView):
    """
    POST /api/auth/customer/change-password/
    Change password for logged-in customer.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({'detail': 'Old and new passwords are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(old_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'detail': 'New password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()

        return Response({'detail': 'Password updated successfully.'})
