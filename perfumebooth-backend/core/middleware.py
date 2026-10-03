"""
Request-ID Middleware for Distributed Request Tracing
"""
import uuid
import contextvars
import re

_request_id_ctx = contextvars.ContextVar('request_id', default=None)
_SAFE_REQUEST_ID = re.compile(r'^[A-Za-z0-9_.-]{1,64}$')


def get_current_request_id() -> str:
    """Return the active request ID for the current thread / async context."""
    return _request_id_ctx.get() or ''


class RequestIDMiddleware:
    """
    Ensures every request has a unique tracking ID.
    Reads X-Request-ID header from incoming requests (e.g. from reverse proxy or client)
    or generates a new 32-character hexadecimal UUID.
    Appends X-Request-ID to the outgoing HTTP response headers.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        supplied_request_id = request.headers.get('X-Request-ID') or request.META.get('HTTP_X_REQUEST_ID')
        request_id = supplied_request_id if supplied_request_id and _SAFE_REQUEST_ID.fullmatch(supplied_request_id) else uuid.uuid4().hex
        request.request_id = request_id
        token = _request_id_ctx.set(request_id)

        try:
            response = self.get_response(request)
        finally:
            _request_id_ctx.reset(token)

        response['X-Request-ID'] = request_id
        return response
