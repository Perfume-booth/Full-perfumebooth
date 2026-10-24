from decimal import Decimal
import uuid
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.orders.models import Order, OrderItem
from apps.cms.models import ContactSubmission, NewsletterSubscriber, NotificationSubscription
from apps.shop.models import Product


class GuestTrackingAndCMSTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email='member@example.com',
            password='Password123!',
            first_name='John',
            last_name='Doe'
        )
        self.product = Product.objects.create(
            title='Royal Oud',
            slug='royal-oud',
            sku='RO-100',
            price=Decimal('1200.00')
        )
        self.order = Order.objects.create(
            user=self.user,
            order_number='1001',
            status=Order.Status.PROCESSING,
            subtotal=Decimal('1200.00'),
            total=Decimal('1200.00'),
            customer_email='guest@example.com',
            shipping_address={
                'first_name': 'Jane',
                'last_name': 'Guest',
                'email': 'guest@example.com',
                'phone': '+919876543210',
                'address1': '101 Fragrance Lane',
                'city': 'Delhi',
                'state': 'Delhi',
                'zip': '110001'
            }
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_title=self.product.title,
            sku=self.product.sku,
            quantity=1,
            unit_price=Decimal('1200.00')
        )

    # 1. Guest Order Tracking Tests
    def test_guest_tracking_requires_params(self):
        res = self.client.get('/api/orders/track/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_guest_tracking_fails_if_email_mismatched(self):
        res = self.client.get('/api/orders/track/', {
            'order_id': '1001',
            'email': 'wrong@example.com'
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_guest_tracking_fails_if_order_not_found(self):
        res = self.client.get('/api/orders/track/', {
            'order_id': '9999',
            'email': 'guest@example.com'
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_guest_tracking_succeeds_with_order_number(self):
        res = self.client.get('/api/orders/track/', {
            'order_id': '1001',
            'email': 'guest@example.com'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get('data', res.json())
        self.assertEqual(data['order_number'], '1001')
        self.assertEqual(len(data['items']), 1)
        self.assertEqual(data['items'][0]['product_title'], 'Royal Oud')

    def test_guest_tracking_succeeds_with_hash_prefix(self):
        res = self.client.get('/api/orders/track/', {
            'order_id': '#1001',
            'email': 'guest@example.com'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get('data', res.json())
        self.assertEqual(data['order_number'], '1001')

    def test_guest_tracking_succeeds_with_uuid(self):
        res = self.client.get('/api/orders/track/', {
            'order_id': str(self.order.id),
            'email': 'guest@example.com'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get('data', res.json())
        self.assertEqual(data['id'], str(self.order.id))

    def test_guest_tracking_succeeds_with_user_email(self):
        res = self.client.get('/api/orders/track/', {
            'order_id': '1001',
            'email': 'member@example.com'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get('data', res.json())
        self.assertEqual(data['order_number'], '1001')

    # 2. Contact Submissions Tests
    def test_contact_submission_validation(self):
        res = self.client.post('/api/cms/contact/', {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.post('/api/cms/contact/', {
            'name': 'Test',
            'email': 'invalid-email',
            'message': 'Hello'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_contact_submission_persists_durably(self):
        res = self.client.post('/api/cms/contact/', {
            'name': 'Aarav Patel',
            'email': 'aarav@example.com',
            'phone': '+919876543210',
            'subject': 'Order Inquiry',
            'message': 'When will my perfume arrive?'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        submission = ContactSubmission.objects.filter(email='aarav@example.com').first()
        self.assertIsNotNone(submission)
        self.assertEqual(submission.name, 'Aarav Patel')
        self.assertEqual(submission.status, ContactSubmission.Status.PENDING)

    # 3. Durable Newsletter Tests
    def test_newsletter_subscribe_invalid_email(self):
        res = self.client.post('/api/cms/newsletter/subscribe/', {'email': 'not-an-email'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_newsletter_subscribe_and_status(self):
        # Subscribe
        sub_email = 'newsletter_fan@example.com'
        res = self.client.post('/api/cms/newsletter/subscribe/', {
            'email': sub_email,
            'source': 'homepage_banner',
            'consent': True
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        res_data = res.json().get('data', res.json())
        self.assertTrue(res_data['success'])

        # Verify DB record
        subscriber = NewsletterSubscriber.objects.filter(email=sub_email).first()
        self.assertIsNotNone(subscriber)
        self.assertFalse(subscriber.is_active)
        sub = NotificationSubscription.objects.get(email=sub_email)
        self.client.post('/api/cms/notifications/manage/', {'token': str(sub.token), 'action': 'confirm'})
        subscriber.refresh_from_db()
        self.assertTrue(subscriber.is_active)
        self.assertEqual(subscriber.source, 'homepage_banner')

        # Check status endpoint
        self.user.email = sub_email
        self.user.save(update_fields=['email'])
        self.client.force_authenticate(user=self.user)
        res = self.client.get(f'/api/cms/newsletter/status/?email={sub_email}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get('data', res.json())
        self.assertTrue(data['isSubscribed'])
        self.assertTrue(data['hasOrders'])

        # Verify with user having orders
        res = self.client.get(f'/api/cms/newsletter/status/?email=guest@example.com')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get('data', res.json())
        self.assertTrue(data['hasOrders'])
        self.assertTrue(data['hasOrders'])
