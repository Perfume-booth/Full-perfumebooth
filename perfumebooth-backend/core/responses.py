"""
Shared API Response Helpers and Standard JSON Renderer
Standard Success Response:
{
  "data": {},
  "meta": {
    "request_id": "..."
  }
}

Standard Error Response:
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested quantity is unavailable.",
    "fields": {},
    "request_id": "..."
  }
}
"""
from rest_framework.response import Response
from rest_framework import status, renderers
from core.middleware import get_current_request_id
from core.constants import ErrorCode


def api_success(data=None, meta=None, status_code=status.HTTP_200_OK, request=None) -> Response:
    """Construct a standard success API Response."""
    request_id = getattr(request, 'request_id', None) if request else None
    if not request_id:
        request_id = get_current_request_id() or ''

    response_meta = {'request_id': request_id}
    if meta and isinstance(meta, dict):
        response_meta.update(meta)

    payload = {
        'data': data if data is not None else {},
        'meta': response_meta
    }
    response = Response(payload, status=status_code)
    response['X-Request-ID'] = request_id
    return response


def api_error(code: str = ErrorCode.VALIDATION_ERROR,
              message: str = "An error occurred.",
              fields: dict = None,
              status_code: int = status.HTTP_400_BAD_REQUEST,
              request=None) -> Response:
    """Construct a standard error API Response."""
    request_id = getattr(request, 'request_id', None) if request else None
    if not request_id:
        request_id = get_current_request_id() or ''

    payload = {
        'error': {
            'code': code,
            'message': message,
            'fields': fields if fields is not None else {},
            'request_id': request_id
        }
    }
    response = Response(payload, status=status_code)
    response['X-Request-ID'] = request_id
    return response


class StandardJSONRenderer(renderers.JSONRenderer):
    """
    DRF JSON Renderer that ensures all responses conform to the standard API contract.
    Preserves already-standardized payloads while automatically wrapping any legacy or
    unwrapped view responses into the expected {data, meta} or {error} structures.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if renderer_context is not None:
            response = renderer_context.get('response')
            request = renderer_context.get('request')
            status_code = getattr(response, 'status_code', 200)

            request_id = getattr(request, 'request_id', None) if request else None
            if not request_id:
                request_id = get_current_request_id() or ''

            # If response is an error (HTTP 4xx / 5xx)
            if status_code >= 400:
                if isinstance(data, dict) and 'error' in data:
                    # Already in standard error format
                    if 'request_id' not in data['error'] or not data['error']['request_id']:
                        data['error']['request_id'] = request_id
                else:
                    # Normalize into standard error format
                    code = ErrorCode.INVALID_INPUT
                    if status_code == 401:
                        code = ErrorCode.AUTHENTICATION_FAILED
                    elif status_code == 403:
                        code = ErrorCode.PERMISSION_DENIED
                    elif status_code == 404:
                        code = ErrorCode.NOT_FOUND
                    elif status_code == 405:
                        code = ErrorCode.METHOD_NOT_ALLOWED
                    elif status_code == 429:
                        code = ErrorCode.THROTTLED
                    elif status_code >= 500:
                        code = ErrorCode.INTERNAL_SERVER_ERROR

                    message = "An error occurred."
                    fields = {}

                    if isinstance(data, dict):
                        if 'detail' in data:
                            message = str(data['detail'])
                            fields = {k: v for k, v in data.items() if k != 'detail'}
                        else:
                            fields = data
                            message = "Validation failed for one or more fields."
                    elif isinstance(data, list):
                        message = "; ".join(str(item) for item in data)
                    elif data is not None:
                        message = str(data)

                    data = {
                        'error': {
                            'code': code,
                            'message': message,
                            'fields': fields,
                            'request_id': request_id
                        }
                    }

            # If response is a success (HTTP 2xx / 3xx)
            elif status_code < 400:
                # Check if already in standard contract {data, meta}
                if not (isinstance(data, dict) and 'data' in data and 'meta' in data):
                    data = {
                        'data': data if data is not None else {},
                        'meta': {
                            'request_id': request_id
                        }
                    }
                else:
                    if 'meta' in data and isinstance(data['meta'], dict):
                        if 'request_id' not in data['meta'] or not data['meta']['request_id']:
                            data['meta']['request_id'] = request_id

            if response is not None and hasattr(response, 'data'):
                response.data = data

        return super().render(data, accepted_media_type, renderer_context)
