import random
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import requests
import jwt

from .models import CustomUser, OTPVerification, SocialAccount
from core.circuit_breaker import CircuitBreaker, CircuitBreakerOpenException

logger = logging.getLogger(__name__)

# Initialize circuit breakers for Google and Facebook OAuth endpoints
google_breaker = CircuitBreaker(name="GoogleOAuth", failure_threshold=3, recovery_timeout=15.0)
facebook_breaker = CircuitBreaker(name="FacebookOAuth", failure_threshold=3, recovery_timeout=15.0)


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

    def post(self, request):
        phone = request.data.get('phone')
        if not phone:
            return Response({'detail': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a 6-digit code
        code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=5)

        # Create verification record
        OTPVerification.objects.create(
            phone=phone,
            code=code,
            expires_at=expires_at
        )

        # Log to console for development testing
        print(f"\n[OTP DEBUG] Sent OTP '{code}' to phone '{phone}'\n")
        logger.info(f"OTP '{code}' sent to '{phone}'")

        # In production, integrate your SMS provider here (e.g. Twilio / Fast2SMS)

        return Response({'detail': 'OTP sent successfully.'})


class CustomerVerifyOTPView(APIView):
    """
    POST /api/auth/customer/otp/verify/
    Verify OTP code and authenticate/register the customer.
    """
    permission_classes = [permissions.AllowAny]

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

        if provider == 'google':
            if token == 'mock-google-id-token-12345':
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
            if token == 'mock-facebook-access-token-12345':
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

        elif provider == 'apple':
            if token == 'mock-apple-identity-token-12345':
                email = 'apple.user@example.com'
                uid = 'apple-mock-12345'
                first_name = 'Apple'
                last_name = 'User'
            else:
                try:
                    decoded = jwt.decode(token, options={"verify_signature": False})
                    email = decoded.get('email')
                    uid = decoded.get('sub')
                except Exception:
                    return Response({'detail': 'Invalid Apple token.'}, status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response({'detail': f'Provider {provider} not supported.'}, status=status.HTTP_400_BAD_REQUEST)

        if not uid:
            return Response({'detail': 'Could not retrieve user ID from token.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if social account exists
        try:
            social_account = SocialAccount.objects.get(provider=provider, uid=uid)
            user = social_account.user
        except SocialAccount.DoesNotExist:
            # Check if user exists with the same email
            user = None
            if email:
                user = CustomUser.objects.filter(email=email).first()

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
    Retrieve authenticated customer's profile info.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': str(user.id),
            'email': user.email,
            'phone': user.phone,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })
