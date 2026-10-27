"""
Test suite for Native, Self-Hosted Review System (Zero SaaS cost).
Verifies:
1. Public GET reviews by slug and by UUID.
2. Unauthenticated / guest review submission with name & email.
3. Order-linked verified buyer badge assignment.
4. Product rating calculation and aggregate updates.
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.shop.models import Product, ProductReview
from apps.orders.models import Order, OrderItem

User = get_user_model()


class NativeReviewSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            title="Lattafa Khamrah Eau De Parfum",
            slug="lattafa-khamrah-edp",
            price=Decimal("2999.00"),
            is_online=True
        )
        self.customer = User.objects.create_user(
            email="perfumelover@example.com",
            first_name="Aarav",
            last_name="Kapoor"
        )

    def test_guest_review_submission_by_slug(self):
        """Guest submits review using product slug without pre-existing login."""
        payload = {
            "name": "Priya Sharma",
            "email": "priya.sharma@example.com",
            "rating": 5,
            "title": "Stunning gourmand scent",
            "comment": "Smells like warm cinnamon, vanilla and amber. Lasts over 8 hours!"
        }
        res = self.client.post(f"/api/shop/products/{self.product.slug}/reviews/", data=payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['data']['review']['rating'], 5)

        # Verify product rating recalculated
        self.product.refresh_from_db()
        self.assertEqual(self.product.attributes.get('rating'), 5.0)
        self.assertEqual(self.product.attributes.get('rating_count'), 1)

    def test_verified_buyer_automatic_detection(self):
        """Reviewer email with completed order automatically gets verified buyer badge."""
        order = Order.objects.create(
            customer_email="verified.customer@example.com",
            status="Delivered",
            subtotal=Decimal("2999.00"),
            total=Decimal("2999.00")
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            unit_price=Decimal("2999.00")
        )

        payload = {
            "name": "Vikram Malhotra",
            "email": "verified.customer@example.com",
            "rating": 5,
            "title": "Authentic bottle and fast delivery",
            "comment": "Batch code checked out 100% authentic. Great packaging."
        }
        res = self.client.post(f"/api/shop/products/{self.product.id}/reviews/", data=payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['data']['review']['is_verified_buyer'])

    def test_get_reviews_by_slug_and_uuid(self):
        """Test reviews retrieval works identically with slug and UUID."""
        ProductReview.objects.create(
            product=self.product,
            user=self.customer,
            rating=4,
            title="Good projection",
            comment="Strong scent, great for winters.",
            is_verified_buyer=True,
            is_approved=True
        )

        # GET by slug
        res_slug = self.client.get(f"/api/shop/products/{self.product.slug}/reviews/")
        self.assertEqual(res_slug.status_code, status.HTTP_200_OK)
        self.assertEqual(res_slug.data['data']['review_count'], 1)
        self.assertEqual(res_slug.data['data']['reviews'][0]['user_name'], "Aarav Kapoor")

        # GET by UUID
        res_uuid = self.client.get(f"/api/shop/products/{self.product.id}/reviews/")
        self.assertEqual(res_uuid.status_code, status.HTTP_200_OK)
        self.assertEqual(res_uuid.data['data']['review_count'], 1)
