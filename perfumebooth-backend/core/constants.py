"""
Core API Constants and Error Codes
"""
from rest_framework.exceptions import APIException
from rest_framework import status


class ErrorCode:
    """Stable, domain-driven API error codes."""
    # Validation & Client Input (400)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK"
    INVALID_COUPON = "INVALID_COUPON"
    CART_EMPTY = "CART_EMPTY"
    PRODUCT_UNAVAILABLE = "PRODUCT_UNAVAILABLE"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    FILE_VALIDATION_ERROR = "FILE_VALIDATION_ERROR"

    # Authentication & Permissions (401, 403)
    NOT_AUTHENTICATED = "NOT_AUTHENTICATED"
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    ACCOUNT_DISABLED = "ACCOUNT_DISABLED"
    PERMISSION_DENIED = "PERMISSION_DENIED"

    # Resources (404, 405, 409)
    NOT_FOUND = "NOT_FOUND"
    ALREADY_EXISTS = "ALREADY_EXISTS"
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"

    # Rate Limiting (429)
    THROTTLED = "THROTTLED"

    # Server & External Services (500, 502, 503)
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


class APIError(APIException):
    """
    Standard domain exception that gets mapped directly into the standard error structure:
    {
      "error": {
        "code": "...",
        "message": "...",
        "fields": {},
        "request_id": "..."
      }
    }
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = ErrorCode.VALIDATION_ERROR
    default_detail = "An error occurred."

    def __init__(self, code: str = None, message: str = None, fields: dict = None, status_code: int = None):
        if status_code is not None:
            self.status_code = status_code
        self.code = code or getattr(self, 'default_code', ErrorCode.VALIDATION_ERROR)
        self.message = message or getattr(self, 'default_detail', "An error occurred.")
        self.fields = fields or {}
        super().__init__(detail=self.message, code=self.code)
