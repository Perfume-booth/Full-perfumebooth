"""
Phase 2 — Standard API Contract Test Suite
Verifies:
1. Request-ID middleware assigns, propagates, and returns X-Request-ID.
2. Global exception handler returns standard error structure:
   { "error": { "code": "...", "message": "...", "fields": {}, "request_id": "..." } }
3. Stable domain error codes (INSUFFICIENT_STOCK, VALIDATION_ERROR, NOT_FOUND, etc.).
4. Standard pagination delivers { data: [...], meta: { request_id: "...", pagination: {...} } }.
5. Money is represented as decimal strings ("1299.00").
6. Shared response helpers (api_success, api_error, StandardJSONRenderer).
7. Versioned endpoints (/api/v1/catalog/, /api/v1/cart/, /api/v1/checkout/, /api/v1/orders/, /api/v1/admin/)
   function alongside legacy unversioned routes.
"""
from decimal import Decimal
from django.test import TestCase, RequestFactory
from django.core.paginator import Paginator
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound, AuthenticationFailed

from core.middleware import RequestIDMiddleware, get_current_request_id
from core.constants import ErrorCode, APIError
from core.exceptions import sanitized_exception_handler
from core.money import format_money, to_decimal
from core.responses import api_success, api_error, StandardJSONRenderer
from core.pagination import StandardPagination
from apps.authentication.models import CustomUser, Role, UserRole
from apps.shop.models import Product


class RequestIDMiddlewareTests(TestCase):
    """Verify request ID middleware generates, propagates, and attaches request IDs."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_generates_request_id_when_missing(self):
        def view(req):
            return Response({'status': 'ok'})

        middleware = RequestIDMiddleware(view)
        request = self.factory.get('/api/health/')
        response = middleware(request)

        self.assertTrue(hasattr(request, 'request_id'))
        self.assertTrue(len(request.request_id) >= 16)
        self.assertEqual(response['X-Request-ID'], request.request_id)

    def test_preserves_incoming_request_id(self):
        def view(req):
            return Response({'status': 'ok'})

        middleware = RequestIDMiddleware(view)
        request = self.factory.get('/api/health/', HTTP_X_REQUEST_ID='client-req-abc-123')
        response = middleware(request)

        self.assertEqual(request.request_id, 'client-req-abc-123')
        self.assertEqual(response['X-Request-ID'], 'client-req-abc-123')

    def test_replaces_unsafe_or_oversized_request_id(self):
        middleware = RequestIDMiddleware(lambda req: Response({'status': 'ok'}))
        unsafe_ids = ['bad\r\nInjected: value', 'x' * 65, 'spaces are not allowed']
        for unsafe_id in unsafe_ids:
            request = self.factory.get('/test/', HTTP_X_REQUEST_ID=unsafe_id)
            response = middleware(request)
            self.assertNotEqual(request.request_id, unsafe_id)
            self.assertEqual(len(request.request_id), 32)
            self.assertEqual(response['X-Request-ID'], request.request_id)

    def test_contextvar_accessible_during_request(self):
        captured_id = []

        def view(req):
            captured_id.append(get_current_request_id())
            return Response({'status': 'ok'})

        middleware = RequestIDMiddleware(view)
        request = self.factory.get('/api/health/', HTTP_X_REQUEST_ID='ctx-test-999')
        middleware(request)

        self.assertEqual(captured_id, ['ctx-test-999'])


class GlobalExceptionHandlerTests(TestCase):
    """Verify standard error contract across exception types."""

    def test_custom_api_error_contract(self):
        exc = APIError(
            code=ErrorCode.INSUFFICIENT_STOCK,
            message="Requested quantity is unavailable.",
            fields={"quantity": ["Only 2 items remain."]},
            status_code=400
        )
        context = {'request': None, 'view': None}
        response = sanitized_exception_handler(exc, context)

        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.data)
        err = response.data['error']
        self.assertEqual(err['code'], 'INSUFFICIENT_STOCK')
        self.assertEqual(err['message'], 'Requested quantity is unavailable.')
        self.assertEqual(err['fields'], {"quantity": ["Only 2 items remain."]})
        self.assertIn('request_id', err)

    def test_drf_validation_error_contract(self):
        exc = ValidationError({"email": ["Enter a valid email address."]})
        context = {'request': None, 'view': None}
        response = sanitized_exception_handler(exc, context)

        self.assertEqual(response.status_code, 400)
        err = response.data['error']
        self.assertEqual(err['code'], 'VALIDATION_ERROR')
        self.assertIn("Enter a valid email address.", err['message'])
        self.assertEqual(err['fields'], {"email": ["Enter a valid email address."]})

    def test_permission_denied_contract(self):
        exc = PermissionDenied("You do not have permission to view staff accounts.")
        context = {'request': None, 'view': None}
        response = sanitized_exception_handler(exc, context)

        self.assertEqual(response.status_code, 403)
        err = response.data['error']
        self.assertEqual(err['code'], 'PERMISSION_DENIED')
        self.assertEqual(err['message'], "You do not have permission to view staff accounts.")

    def test_not_found_contract(self):
        exc = NotFound("Product not found.")
        context = {'request': None, 'view': None}
        response = sanitized_exception_handler(exc, context)

        self.assertEqual(response.status_code, 404)
        err = response.data['error']
        self.assertEqual(err['code'], 'NOT_FOUND')
        self.assertEqual(err['message'], "Product not found.")

    def test_unhandled_server_error_contract(self):
        exc = ValueError("Secret key or database connection issue")
        context = {'request': None, 'view': None}
        response = sanitized_exception_handler(exc, context)

        self.assertEqual(response.status_code, 500)
        err = response.data['error']
        self.assertEqual(err['code'], 'INTERNAL_SERVER_ERROR')
        self.assertEqual(err['message'], "An unexpected server error occurred. Please try again later.")
        self.assertNotIn("Secret key", err['message'])


class MoneyFormattingTests(TestCase):
    """Verify money representation as standard decimal strings."""

    def test_format_money_standard_values(self):
        self.assertEqual(format_money(1299), "1299.00")
        self.assertEqual(format_money(49.9), "49.90")
        self.assertEqual(format_money("1500.555"), "1500.56")
        self.assertEqual(format_money(0), "0.00")
        self.assertEqual(format_money(None), "0.00")
        self.assertEqual(format_money(Decimal("250.75")), "250.75")

    def test_to_decimal_safety(self):
        self.assertEqual(to_decimal("100.50"), Decimal("100.50"))
        self.assertEqual(to_decimal("invalid-string", default="0.00"), Decimal("0.00"))


class ResponseHelpersTests(TestCase):
    """Verify shared response helpers api_success and api_error."""

    def test_api_success_helper(self):
        resp = api_success(
            data={"id": "prod-1", "title": "Velvet Oud"},
            meta={"custom_tag": "luxury"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("data", resp.data)
        self.assertIn("meta", resp.data)
        self.assertEqual(resp.data["data"]["title"], "Velvet Oud")
        self.assertEqual(resp.data["meta"]["custom_tag"], "luxury")
        self.assertIn("request_id", resp.data["meta"])

    def test_api_error_helper(self):
        resp = api_error(
            code=ErrorCode.INSUFFICIENT_STOCK,
            message="Item is out of stock.",
            fields={"sku": "OUT-OF-STOCK"},
            status_code=400
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("error", resp.data)
        self.assertEqual(resp.data["error"]["code"], "INSUFFICIENT_STOCK")
        self.assertEqual(resp.data["error"]["message"], "Item is out of stock.")
        self.assertEqual(resp.data["error"]["fields"]["sku"], "OUT-OF-STOCK")


class StandardPaginationTests(TestCase):
    """Verify pagination format conforming to { data: [...], meta: { request_id, pagination } }."""

    def test_standard_pagination_response(self):
        from rest_framework.request import Request
        factory = APIRequestFactory()
        wsgi_req = factory.get('/api/v1/catalog/products/?page=1&page_size=2')
        drf_req = Request(wsgi_req)
        drf_req.request_id = 'page-test-req-01'

        queryset = ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"]
        pagination = StandardPagination()
        page = pagination.paginate_queryset(queryset, drf_req)
        response = pagination.get_paginated_response(page)

        self.assertEqual(response.status_code, 200)
        self.assertIn('data', response.data)
        self.assertIn('meta', response.data)
        self.assertIn('pagination', response.data['meta'])

        meta_page = response.data['meta']['pagination']
        self.assertEqual(meta_page['page'], 1)
        self.assertEqual(meta_page['page_size'], 2)
        self.assertEqual(meta_page['total_count'], 5)
        self.assertEqual(meta_page['total_pages'], 3)
        self.assertTrue(meta_page['has_next'])
        self.assertFalse(meta_page['has_previous'])


class VersionedAPIRoutesTests(TestCase):
    """Verify versioned /api/v1/ endpoints are reachable alongside legacy routes."""

    def setUp(self):
        self.client = APIClient()

        # Create admin user
        self.admin = CustomUser.objects.create_user(
            email='admin_v1@perfumebooth.com',
            password='AdminPassword123!',
            is_staff=True
        )
        role = Role.objects.create(name='Super Admin')
        UserRole.objects.create(user=self.admin, role=role)

    def test_v1_catalog_products_reachable(self):
        resp = self.client.get('/api/v1/catalog/products/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Verify wire-format contract has { data, meta }
        json_data = resp.json()
        self.assertIn('data', json_data)
        self.assertIn('meta', json_data)
        self.assertIn('request_id', json_data['meta'])

    def test_v1_catalog_collections_reachable(self):
        resp = self.client.get('/api/v1/catalog/collections/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_v1_cart_validate_reachable(self):
        resp = self.client.post('/api/v1/cart/validate/', {'items': []}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_v1_checkout_anonymous_order_list_requires_auth(self):
        resp = self.client.get('/api/v1/checkout/')
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED])

    def test_v1_orders_anonymous_requires_auth(self):
        resp = self.client.get('/api/v1/orders/')
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_v1_admin_anonymous_forbidden(self):
        resp = self.client.get('/api/v1/admin/staff/')
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_v1_admin_authorized_accessible(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/v1/admin/staff/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_v1_admin_import_export_routes_are_not_shadowed(self):
        from django.urls import resolve
        export_match = resolve('/api/v1/admin/products/excel-export/')
        import_match = resolve('/api/v1/admin/products/excel-import/')
        self.assertEqual(export_match.url_name, 'v1-admin-products-excel-export')
        self.assertEqual(import_match.url_name, 'v1-admin-products-excel-import')

    def test_duplicate_checkout_alias_is_removed(self):
        resp = self.client.post('/api/v1/checkout/orders/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_legacy_routes_still_accessible(self):
        # Legacy catalog endpoint
        resp_shop = self.client.get('/api/shop/products/')
        self.assertEqual(resp_shop.status_code, status.HTTP_200_OK)

        # Legacy collections endpoint
        resp_collections = self.client.get('/api/shop/collections/')
        self.assertEqual(resp_collections.status_code, status.HTTP_200_OK)
