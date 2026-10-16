"""
Custom Authentication Classes for PerfumeBooth
"""
from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication that skips CSRF validation for headless cross-origin APIs.
    Security is maintained via CORS (CORS_ALLOWED_ORIGINS) and browser SameSite cookie policy.
    """
    def enforce_csrf(self, request):
        return  # Do not enforce CSRF on REST API endpoints
