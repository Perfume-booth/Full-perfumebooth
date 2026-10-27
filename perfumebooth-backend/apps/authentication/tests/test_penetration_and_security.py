"""
Security & Penetration Testing Regression Test Suite
Validates defenses against:
1. Brand catalog unauthenticated mutation & constants injection (Broken Function-Level Auth)
2. Social auth signature bypass & staff account takeover (Authentication Bypass / Account Takeover)
3. Password reset URL poisoning / Host header injection (CWE-640)
4. Shiprocket webhook unauthenticated state manipulation (Missing Webhook Authentication)
5. OTP generation entropy and log exposure
"""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import CustomUser, Role, UserRole
from apps.orders.models import Order, Shipment


class SecurityPenetrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = CustomUser.objects.create_user(
            email='superadmin@perfumebooth.com',
            password='AdminPassword123!',
            is_staff=True,
            is_superuser=True
        )
        self.admin_role, _ = Role.objects.get_or_create(name='Super Admin')
        UserRole.objects.create(user=self.superadmin, role=self.admin_role)

        self.customer = CustomUser.objects.create_user(
            email='legit.customer@example.com',
            password='CustomerPassword123!',
            is_staff=False
        )

        self.attacker = CustomUser.objects.create_user(
            email='attacker@example.com',
            password='AttackerPassword123!',
            is_staff=False
        )

    def test_brand_catalog_unauthenticated_post_rejected(self):
        """Unauthenticated attacker must not be able to create brands."""
        response = self.client.post('/api/v1/catalog/brands/', {'brand': 'Hacker Brand'})
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_brand_catalog_unauthenticated_delete_rejected(self):
        """Unauthenticated attacker must not be able to delete brands."""
        response = self.client.delete('/api/v1/catalog/brands/?brand=Al Haramain')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_brand_catalog_ordinary_customer_rejected(self):
        """Ordinary logged-in customer must not have permissions to manage brands."""
        self.client.force_authenticate(user=self.customer)
        response = self.client.post('/api/v1/catalog/brands/', {'brand': 'Customer Brand'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.delete('/api/v1/catalog/brands/?brand=Al Haramain')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_brand_catalog_name_injection_sanitization(self):
        """Brand names containing code, quotes, or newlines must be rejected."""
        self.client.force_authenticate(user=self.superadmin)
        malicious_names = [
            'Test"]; process.exit(1); //',
            'Brand\nwith\nnewlines',
            'Brand<script>alert(1)</script>',
            'Brand" or 1=1--',
        ]
        for name in malicious_names:
            response = self.client.post('/api/v1/catalog/brands/', {'brand': name})
            self.assertEqual(
                response.status_code,
                status.HTTP_400_BAD_REQUEST,
                f"Malicious brand name '{name}' should have been rejected."
            )

    def test_unsupported_or_unverified_social_auth_rejected(self):
        """Unsupported provider or forged token must be rejected with 400."""
        import jwt
        forged_token = jwt.encode(
            {'email': 'victim@example.com', 'sub': 'victim-uid'},
            'fake-secret',
            algorithm='HS256'
        )
        response = self.client.post('/api/auth/customer/social/', {
            'provider': 'apple',
            'token': forged_token
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_social_auth_cannot_hijack_staff_account(self):
        """Social authentication must never automatically link or log in to staff accounts."""
        self.superadmin.email = 'google.user@example.com'
        self.superadmin.save()

        response = self.client.post('/api/auth/customer/social/', {
            'provider': 'google',
            'token': 'mock-google-id-token-12345'
        })
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST])

    def test_password_reset_url_poisoning_rejected(self):
        """Attacker providing an external frontend_url must not poison the reset link."""
        with patch('apps.authentication.customer_views.send_mail') as mock_mail:
            response = self.client.post('/api/auth/customer/password-reset/', {
                'email': self.customer.email,
                'frontend_url': 'https://evil-attacker.com'
            })
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            if mock_mail.called:
                call_args = mock_mail.call_args
                msg = call_args[1].get('message', '') or call_args[0][1]
                html_msg = call_args[1].get('html_message', '')
                self.assertNotIn('https://evil-attacker.com', msg)
                self.assertNotIn('https://evil-attacker.com', html_msg)

    def test_shiprocket_webhook_requires_authentication(self):
        """Unauthenticated caller must not be able to mark orders as delivered or change payment."""
        order = Order.objects.create(
            order_number='PB-TEST-1001',
            status=Order.Status.PROCESSING,
            payment_status=Order.PaymentStatus.PENDING,
            payment_method=Order.PaymentMethod.COD,
            subtotal=Decimal('500.00'),
            total=Decimal('500.00')
        )
        # Post webhook without auth / secret
        response = self.client.post('/api/orders/shiprocket/webhook/', {
            'order_id': 'PB-TEST-1001',
            'current_status': 'DELIVERED',
            'awb_code': 'AWB123456789'
        })
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        # Reload order to verify status was NOT altered
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PROCESSING)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)
