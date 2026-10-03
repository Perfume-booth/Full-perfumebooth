"""
Custom DRF Throttles for Authentication and Checkout Protection
"""
from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """Rate limit for authentication endpoints (login, register)."""
    scope = 'auth'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class OTPRateThrottle(SimpleRateThrottle):
    """Strict rate limit for OTP request and verification endpoints."""
    scope = 'otp'

    def get_cache_key(self, request, view):
        phone = None
        if hasattr(request, 'data') and isinstance(request.data, dict):
            phone = request.data.get('phone')
        if phone:
            ident = f"{self.get_ident(request)}_{phone}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class CheckoutRateThrottle(SimpleRateThrottle):
    """Rate limit for checkout / order placement endpoints."""
    scope = 'checkout'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }
