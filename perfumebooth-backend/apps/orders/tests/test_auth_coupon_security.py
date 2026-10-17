from decimal import Decimal
from types import SimpleNamespace

from django.contrib.sessions.models import Session
from django.test import TestCase
from rest_framework.test import APIClient

from apps.authentication.models import CustomUser, Role, UserRole
from apps.authentication.views import HasRolePermission
from apps.checkout.exceptions import InvalidCouponException
from apps.checkout.services.pricing_service import PricingService
from apps.orders.models import Coupon, Order


class AuthCouponSecurityTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email='buyer@example.com', password='Test-pass-123!')
        self.coupon = Coupon.objects.create(code='SAVE10', discount_value=10, first_order_only=True)

    def calculate(self, **kwargs):
        return PricingService.validate_and_calculate_coupon(' save10 ', Decimal('1000'), **kwargs)

    def test_disabled_legacy_coupon_rejected(self):
        self.coupon.is_active = False
        self.coupon.save()
        with self.assertRaises(InvalidCouponException):
            self.calculate(user=self.user)

    def test_deleted_legacy_coupon_rejected(self):
        self.coupon.delete()
        for code in ['SAVE10', 'FREESHIP', 'BLOOM15', 'MEN15', 'WOMEN15']:
            with self.subTest(code=code), self.assertRaises(InvalidCouponException):
                PricingService.validate_and_calculate_coupon(code, Decimal('1000'))

    def test_guest_without_identity_rejected(self):
        with self.assertRaises(InvalidCouponException):
            self.calculate()

    def test_new_guest_eligible(self):
        self.assertEqual(self.calculate(customer_email='new@example.com')['discount_amount'], Decimal('100'))

    def test_guest_previous_order_case_insensitive(self):
        Order.objects.create(order_number='OLD', customer_email='BUYER@example.com', subtotal=100, total=100)
        with self.assertRaises(InvalidCouponException):
            self.calculate(customer_email='buyer@example.com')

    def test_authenticated_identity_cannot_be_overridden(self):
        Order.objects.create(order_number='OLD', customer_email=self.user.email, subtotal=100, total=100)
        with self.assertRaises(InvalidCouponException):
            self.calculate(user=self.user, customer_email='different@example.com')

    def test_cancelled_order_does_not_block_first_order(self):
        Order.objects.create(order_number='OLD', customer_email=self.user.email, subtotal=100, total=100, status=Order.Status.CANCELLED)
        self.assertTrue(self.calculate(user=self.user)['valid'])

    def test_logout_flushes_session_and_replay_fails(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.user)
        old_session = client.cookies['sessionid'].value
        client.get('/api/auth/csrf/')
        self.assertEqual(client.post('/api/auth/logout/').status_code, 403)
        token = client.cookies['csrftoken'].value
        self.assertEqual(client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertFalse(Session.objects.filter(session_key=old_session).exists())
        client.cookies['sessionid'] = old_session
        self.assertIn(client.get('/api/auth/me/').status_code, [401, 403])

    def test_staff_role_matrix_direct_api(self):
        client = APIClient()
        client.force_authenticate(self.user)
        for name in ['Super Admin', 'Admin', 'E-commerce Executive', 'Content Manager', 'Customer']:
            role, _ = Role.objects.get_or_create(name=name)
            self.user.roles.all().delete()
            UserRole.objects.create(user=self.user, role=role)
            with self.subTest(role=name):
                self.assertEqual(client.get('/api/auth/staff/').status_code, 200 if name == 'Super Admin' else 403)
                expected = 200 if name in ['Super Admin', 'Admin', 'E-commerce Executive'] else 403
                self.assertEqual(client.get('/api/orders/merchant/coupons/').status_code, expected)
                if name != 'Super Admin':
                    self.assertEqual(client.post('/api/auth/staff/', {}).status_code, 403)
                    self.assertEqual(client.post('/api/auth/reset-staff-password/', {}).status_code, 403)
                    self.assertEqual(client.delete(f'/api/auth/staff/{self.user.pk}/').status_code, 403)

    def test_role_permission_fails_closed(self):
        request = SimpleNamespace(user=self.user)
        self.assertFalse(HasRolePermission().has_permission(request, SimpleNamespace()))
        role, _ = Role.objects.get_or_create(name='Admin')
        UserRole.objects.create(user=self.user, role=role)
        self.user.is_active = False
        self.assertFalse(HasRolePermission().has_permission(request, SimpleNamespace(allowed_roles=['Admin'])))
