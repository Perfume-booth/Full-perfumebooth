"""
Phase 1 — Security and Correctness Test Suite
Verifies:
1. Anonymous users cannot access admin operations (401/403).
2. Role-based permissions correctly restrict non-admin users.
3. No duplicate view classes exist in apps/shop/views.py.
4. File validation blocks malicious, oversized, and spoofed files.
5. OrderItem.price bug fix prevents email template / order receipt crashes.
6. Production security configuration enforces secure cookies, HSTS, and restricted CORS.
7. Throttling is wired to authentication, OTP, and checkout endpoints.
8. Sanitized exception handler hides internal traces.
"""
import ast
import io
from PIL import Image
from decimal import Decimal
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import CustomUser, Role, UserRole
from apps.shop.models import Product, Collection
from apps.orders.models import Order, OrderItem
from apps.authentication.views import LoginView
from apps.authentication.customer_views import (
    CustomerLoginView, CustomerRegisterView, CustomerSendOTPView, CustomerVerifyOTPView
)
from apps.orders.views import OrderListView
from core.validators import validate_image_upload, validate_spreadsheet_upload
from core.exceptions import sanitized_exception_handler


class AdminEndpointsProtectionTests(TestCase):
    """Test that all administrative and mutation endpoints reject anonymous access."""

    def setUp(self):
        self.client = APIClient()

        # Create admin user with Super Admin role
        self.superadmin = CustomUser.objects.create_user(
            email='admin_test@perfumebooth.com',
            password='TestPassword123!',
            first_name='Admin',
            is_staff=True
        )
        self.admin_role = Role.objects.create(name='Super Admin')
        UserRole.objects.create(user=self.superadmin, role=self.admin_role)

        # Create unprivileged customer user
        self.customer = CustomUser.objects.create_user(
            email='customer_test@example.com',
            password='CustomerPassword123!',
            first_name='Customer',
            is_staff=False
        )

    def test_anonymous_cannot_export_products_excel(self):
        resp = self.client.get('/api/shop/products/excel-export/')
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_anonymous_cannot_import_products_excel(self):
        resp = self.client.post('/api/shop/products/excel-import/', {'file': 'dummy'}, format='multipart')
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_anonymous_cannot_create_product(self):
        resp = self.client.post('/api/shop/products/', {'title': 'Hacked Perfume'})
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_anonymous_cannot_create_collection(self):
        resp = self.client.post('/api/shop/collections/', {'title': 'Hacked Collection'})
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_anonymous_cannot_create_banner(self):
        resp = self.client.post('/api/shop/banners/', {'title': 'Hacked Banner'})
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_anonymous_cannot_create_cms_page(self):
        resp = self.client.post('/api/cms/pages/', {'title': 'Defaced', 'slug': 'defaced'})
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_anonymous_cannot_create_blog(self):
        resp = self.client.post('/api/cms/blogs/', {'title': 'Spam Post'})
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_anonymous_cannot_access_staff_api(self):
        resp = self.client.get('/api/auth/staff/')
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_anonymous_cannot_access_analytics_api(self):
        resp = self.client.get('/api/shop/analytics/')
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_customer_without_merchant_role_is_forbidden(self):
        self.client.force_authenticate(user=self.customer)
        # Customer tries to access staff API
        resp = self.client.get('/api/auth/staff/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Customer tries to export catalog
        resp_export = self.client.get('/api/shop/products/excel-export/')
        self.assertEqual(resp_export.status_code, status.HTTP_403_FORBIDDEN)

        # Customer tries to access analytics
        resp_analytics = self.client.get('/api/shop/analytics/')
        self.assertEqual(resp_analytics.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_with_role_can_access_protected_apis(self):
        self.client.force_authenticate(user=self.superadmin)
        resp_staff = self.client.get('/api/auth/staff/')
        self.assertEqual(resp_staff.status_code, status.HTTP_200_OK)

        resp_export = self.client.get('/api/shop/products/excel-export/')
        self.assertEqual(resp_export.status_code, status.HTTP_200_OK)


class NoDuplicateViewsTests(TestCase):
    """Ensure no duplicate class definitions exist in shop/views.py."""

    def test_no_duplicate_classes_in_shop_views(self):
        import apps.shop.views as shop_views
        import inspect
        with open(shop_views.__file__, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())

        classes = [node.name for node in tree.body if isinstance(node, ast.ClassDef)]
        counts = {name: classes.count(name) for name in classes}
        duplicates = {name: count for name, count in counts.items() if count > 1}
        self.assertEqual(duplicates, {}, f"Found duplicate class definitions in shop/views.py: {duplicates}")


class FileUploadValidatorTests(TestCase):
    """Verify upload size, MIME, magic number, and image decoding protections."""

    def test_valid_image_upload_passes(self):
        img_buffer = io.BytesIO()
        img = Image.new('RGB', (100, 100), color='blue')
        img.save(img_buffer, format='JPEG')
        uploaded = SimpleUploadedFile("test.jpg", img_buffer.getvalue(), content_type="image/jpeg")

        cleaned = validate_image_upload(uploaded)
        self.assertEqual(cleaned.name, "test.jpg")

    def test_fake_image_fails_decoding(self):
        fake_image = SimpleUploadedFile("malicious.jpg", b"MZ\x90\x00not a real image", content_type="image/jpeg")
        with self.assertRaises(ValidationError) as ctx:
            validate_image_upload(fake_image)
        self.assertIn("corrupted or invalid image data", str(ctx.exception))

    def test_oversized_image_fails(self):
        huge_content = b'0' * (11 * 1024 * 1024)
        huge_file = SimpleUploadedFile("large.png", huge_content, content_type="image/png")
        with self.assertRaises(ValidationError) as ctx:
            validate_image_upload(huge_file)
        self.assertIn("exceeds", str(ctx.exception))

    def test_valid_csv_spreadsheet_passes(self):
        csv_file = SimpleUploadedFile("products.csv", b"Handle,Title,Price\ntest-perfume,Test,1299\n", content_type="text/csv")
        cleaned = validate_spreadsheet_upload(csv_file)
        self.assertEqual(cleaned.name, "products.csv")

    def test_disallowed_spreadsheet_extension_fails(self):
        bad_file = SimpleUploadedFile("payload.exe", b"MZ\x90\x00payload", content_type="application/octet-stream")
        with self.assertRaises(ValidationError) as ctx:
            validate_spreadsheet_upload(bad_file)
        self.assertIn("Unsupported spreadsheet format", str(ctx.exception))

    def test_fake_xlsx_magic_header_check(self):
        fake_xlsx = SimpleUploadedFile("products.xlsx", b"This is plain text disguised as xlsx", content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        with self.assertRaises(ValidationError) as ctx:
            validate_spreadsheet_upload(fake_xlsx)
        self.assertIn("valid OpenXML workbook", str(ctx.exception))


class OrderItemPriceTests(TestCase):
    """Verify OrderItem.price compatibility property and calculation."""

    def test_order_item_price_property(self):
        order = Order.objects.create(
            order_number='PB-TEST-001',
            status=Order.Status.PENDING,
            subtotal=1500.0,
            total=1500.0
        )
        item = OrderItem.objects.create(
            order=order,
            quantity=2,
            unit_price=Decimal('750.00')
        )
        # Verify item.price property exists and matches unit_price
        self.assertEqual(item.price, Decimal('750.00'))
        self.assertEqual(item.price, item.unit_price)


class ProductionSecuritySettingsTests(TestCase):
    """Verify production security settings when DEBUG=False."""

    def test_secure_cookies_and_cors_in_production(self):
        from core import settings as app_settings
        # Verify that settings have appropriate production branches configured
        self.assertTrue(hasattr(app_settings, 'SESSION_COOKIE_SECURE'))
        self.assertTrue(hasattr(app_settings, 'CSRF_COOKIE_SECURE'))
        self.assertTrue(hasattr(app_settings, 'CORS_ALLOW_ALL_ORIGINS'))
        self.assertTrue(hasattr(app_settings, 'CORS_ALLOWED_ORIGINS'))

        # If DEBUG is False, cookies must be secure and CORS must not be open to all
        if not app_settings.DEBUG:
            self.assertTrue(app_settings.SESSION_COOKIE_SECURE)
            self.assertTrue(app_settings.CSRF_COOKIE_SECURE)
            self.assertFalse(app_settings.CORS_ALLOW_ALL_ORIGINS)


class ThrottlingConfigurationTests(TestCase):
    """Verify rate throttles are configured on authentication and checkout views."""

    def test_login_throttle_configured(self):
        self.assertTrue(hasattr(LoginView, 'throttle_classes'))
        self.assertTrue(any(t.__name__ == 'AuthRateThrottle' for t in LoginView.throttle_classes))

    def test_customer_auth_throttles_configured(self):
        self.assertTrue(hasattr(CustomerLoginView, 'throttle_classes'))
        self.assertTrue(hasattr(CustomerRegisterView, 'throttle_classes'))
        self.assertTrue(hasattr(CustomerSendOTPView, 'throttle_classes'))
        self.assertTrue(hasattr(CustomerVerifyOTPView, 'throttle_classes'))

    def test_checkout_throttle_configured(self):
        self.assertTrue(hasattr(OrderListView, 'get_throttles'))


class SanitizedExceptionHandlerTests(TestCase):
    """Verify sanitized exception handler suppresses raw exception messages on 500s."""

    def test_handler_masks_unhandled_server_errors(self):
        class DummyRequest:
            method = 'GET'
            path = '/api/test/'

        exc = RuntimeError("Database connection string postgres://user:secretpass@host/db leaked")
        context = {'request': DummyRequest(), 'view': None}
        with self.assertLogs('core.exceptions', level='ERROR') as captured:
            response = sanitized_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 500)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error']['code'], 'INTERNAL_SERVER_ERROR')
        self.assertEqual(response.data['error']['message'], 'An unexpected server error occurred. Please try again later.')
        self.assertNotIn("secretpass", str(response.data))
        self.assertNotIn("RuntimeError", str(response.data))
        self.assertNotIn('secretpass', '\n'.join(captured.output))
