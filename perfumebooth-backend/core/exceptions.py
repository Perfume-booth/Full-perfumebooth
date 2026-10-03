"""
Custom DRF Global Exception Handler
Formats ALL API errors to the standard contract:
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested quantity is unavailable.",
    "fields": {},
    "request_id": "..."
  }
}
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError, AuthenticationFailed, NotAuthenticated, PermissionDenied, NotFound, MethodNotAllowed, Throttled

from core.middleware import get_current_request_id
from core.constants import ErrorCode, APIError

logger = logging.getLogger(__name__)


def sanitized_exception_handler(exc, context):
    """
    Global exception handler that ensures every error response follows the standard contract:
    {
      "error": {
        "code": "...",
        "message": "...",
        "fields": {},
        "request_id": "..."
      }
    }
    """
    request = context.get('request') if context else None
    request_id = getattr(request, 'request_id', None) if request else None
    if not request_id:
        request_id = get_current_request_id() or ''

    # Handle custom APIError exceptions directly
    if isinstance(exc, APIError):
        response = Response(
            {
                'error': {
                    'code': exc.code,
                    'message': exc.message,
                    'fields': exc.fields,
                    'request_id': request_id
                }
            },
            status=exc.status_code
        )
        response['X-Request-ID'] = request_id
        return response

    response = exception_handler(exc, context)

    # If DRF didn't handle the exception, it is an unexpected server error (500)
    if response is None:
        view_name = context.get('view').__class__.__name__ if context and context.get('view') else 'UnknownView'
        path = request.path if request else 'UnknownPath'

        # Do not interpolate exception messages: database/provider errors can contain secrets.
        logger.error(
            "Unhandled server exception in %s on %s (type=%s)",
            view_name,
            path,
            type(exc).__name__,
        )

        response = Response(
            {
                'error': {
                    'code': ErrorCode.INTERNAL_SERVER_ERROR,
                    'message': 'An unexpected server error occurred. Please try again later.',
                    'fields': {},
                    'request_id': request_id
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        response['X-Request-ID'] = request_id
        return response

    # Determine stable error code based on exception type and HTTP status
    code = ErrorCode.INVALID_INPUT
    if isinstance(exc, (AuthenticationFailed, NotAuthenticated)) or response.status_code == 401:
        code = ErrorCode.AUTHENTICATION_FAILED
    elif isinstance(exc, PermissionDenied) or response.status_code == 403:
        code = ErrorCode.PERMISSION_DENIED
    elif isinstance(exc, NotFound) or response.status_code == 404:
        code = ErrorCode.NOT_FOUND
    elif isinstance(exc, MethodNotAllowed) or response.status_code == 405:
        code = ErrorCode.METHOD_NOT_ALLOWED
    elif isinstance(exc, Throttled) or response.status_code == 429:
        code = ErrorCode.THROTTLED
    elif isinstance(exc, ValidationError) or response.status_code == 400:
        code = ErrorCode.VALIDATION_ERROR
    elif response.status_code >= 500:
        code = ErrorCode.INTERNAL_SERVER_ERROR

    # Extract message and field-specific errors
    message = "An error occurred."
    fields = {}

    if isinstance(response.data, dict):
        if 'detail' in response.data:
            detail_val = response.data['detail']
            message = str(detail_val)
            if hasattr(detail_val, 'code') and detail_val.code and detail_val.code != 'invalid':
                code = str(detail_val.code).upper()
            fields = {k: v for k, v in response.data.items() if k != 'detail'}
        else:
            fields = response.data
            first_field = next(iter(response.data))
            first_err = response.data[first_field]
            err_text = first_err[0] if isinstance(first_err, list) and first_err else str(first_err)
            message = f"{first_field}: {err_text}" if first_field != 'non_field_errors' else str(err_text)
    elif isinstance(response.data, list):
        message = "; ".join(str(item) for item in response.data)
    elif response.data is not None:
        message = str(response.data)

    response.data = {
        'error': {
            'code': code,
            'message': message,
            'fields': fields,
            'request_id': request_id
        }
    }
    response['X-Request-ID'] = request_id
    return response
