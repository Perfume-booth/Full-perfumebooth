"""
Tests for Contact Inquiries and Product Reviews Admin API & Excel Export
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import Role, UserRole
from apps.cms.models import ContactSubmission
from apps.shop.models import Product, ProductReview
from decimal import Decimal

User = get_user_model()


class InquiriesAndReviewsAdminTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role, _ = Role.objects.get_or_create(name='Super Admin', defaults={'permissions': {'all': True}})
        self.admin_user = User.objects.create_user(
            email='admin@perfumebooth.com',
            password='AdminPassword123!',
            is_staff=True,
            first_name='Admin',
            last_name='User'
        )
        UserRole.objects.create(user=self.admin_user, role=self.role)
        self.client.force_authenticate(user=self.admin_user)

        # Create sample contact submission
        self.inquiry = ContactSubmission.objects.create(
            name="Rahul Sharma",
            email="rahul@example.com",
            phone="9876543210",
            subject="Fragrance authenticity query",
            message="Hello, can you confirm batch code verification?",
            status=ContactSubmission.Status.PENDING
        )

        # Create sample product and review
        self.product = Product.objects.create(
            title="Swiss Arabian Shaghaf Oud",
            slug="swiss-arabian-shaghaf-oud",
            price=Decimal("4500.00"),
            is_online=True
        )
        self.review = ProductReview.objects.create(
            product=self.product,
            user=self.admin_user,
            rating=5,
            title="Luxurious long-lasting scent",
            comment="One of the best gourmand ouds on the market.",
            is_verified_buyer=True,
            is_approved=True
        )

    def test_list_inquiries(self):
        res = self.client.get('/api/cms/inquiries/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        if 'data' in data:
            data = data['data']
        self.assertEqual(data['total'], 1)
        self.assertEqual(data['inquiries'][0]['name'], "Rahul Sharma")
        self.assertEqual(data['counts']['pending'], 1)

    def test_update_inquiry_status(self):
        res = self.client.patch(f'/api/cms/inquiries/{self.inquiry.id}/', {'status': 'replied'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.inquiry.refresh_from_db()
        self.assertEqual(self.inquiry.status, 'replied')

    def test_export_inquiries_excel(self):
        res = self.client.get('/api/cms/inquiries/export/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', res['Content-Type'])
        self.assertTrue(len(res.content) > 1000)

    def test_list_reviews(self):
        res = self.client.get('/api/shop/admin/reviews/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        if 'data' in data:
            data = data['data']
        self.assertEqual(data['total'], 1)
        self.assertEqual(data['reviews'][0]['product_title'], "Swiss Arabian Shaghaf Oud")
        self.assertEqual(data['reviews'][0]['rating'], 5)

    def test_toggle_review_approval(self):
        res = self.client.patch(f'/api/shop/admin/reviews/{self.review.id}/', {'is_approved': False}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.review.refresh_from_db()
        self.assertFalse(self.review.is_approved)

    def test_export_reviews_excel(self):
        res = self.client.get('/api/shop/admin/reviews/export/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', res['Content-Type'])
        self.assertTrue(len(res.content) > 1000)
