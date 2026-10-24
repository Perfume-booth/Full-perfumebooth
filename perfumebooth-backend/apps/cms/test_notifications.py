from datetime import timedelta
from unittest.mock import patch
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.shop.models import Product, ProductVariant, Inventory
from .models import NewsletterSubscriber, NotificationSubscription
from .notifications import process_notifications


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', CUSTOMER_NOTIFICATIONS_ENABLED=True, NOTIFICATION_SITE_URL='http://localhost:3001')
class NotificationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.product = Product.objects.create(title='Test perfume', slug='test-perfume', sku='TEST', price=100, is_online=True)
        self.stock = Inventory.objects.create(product=self.product, stock_level=0)

    def signup(self, kind='newsletter', **extra):
        path = 'newsletter/subscribe/' if kind == 'newsletter' else 'notifications/restock/'
        data = {'email': 'Person@example.com', 'consent': True}
        if kind == 'restock': data['product_id'] = str(self.product.pk)
        data.update(extra)
        return self.client.post('/api/cms/' + path, data, format='json')

    def manage(self, sub, action):
        return self.client.post('/api/cms/notifications/manage/', {'token': str(sub.token), 'action': action}, format='json')

    def test_newsletter_confirmation_dedup_and_unsubscribe(self):
        self.assertEqual(self.signup().status_code, 200)
        self.assertEqual(self.signup(email='person@EXAMPLE.com').status_code, 200)
        self.assertEqual(NotificationSubscription.objects.count(), 1)
        self.assertFalse(NewsletterSubscriber.objects.get().is_active)
        self.assertEqual(process_notifications(), 1)
        self.assertEqual(process_notifications(), 0)
        self.assertEqual(len(mail.outbox), 1)
        sub = NotificationSubscription.objects.get()
        self.assertIn(str(sub.token), mail.outbox[0].body)
        self.assertEqual(self.manage(sub, 'confirm').status_code, 200)
        self.assertTrue(NewsletterSubscriber.objects.get().is_active)
        self.assertEqual(self.manage(sub, 'unsubscribe').status_code, 200)
        self.assertFalse(NewsletterSubscriber.objects.get().is_active)
        self.assertEqual(self.manage(sub, 'confirm').status_code, 400)

    def test_restock_requires_confirmation_and_available_not_reserved_stock(self):
        self.assertEqual(self.signup('restock').status_code, 200)
        sub = NotificationSubscription.objects.get()
        self.assertEqual(process_notifications(), 1)
        self.stock.stock_level = self.stock.reserved_stock = 2
        self.stock.save()
        self.manage(sub, 'confirm')
        self.assertEqual(process_notifications(), 0)
        self.stock.reserved_stock = 1
        self.stock.save()
        self.assertEqual(process_notifications(), 1)
        self.assertEqual(process_notifications(), 0)
        self.assertEqual(len(mail.outbox), 2)
        self.assertFalse(NewsletterSubscriber.objects.exists())
        sub.refresh_from_db()
        self.assertIsNotNone(sub.notified_at)

    def test_variant_specific_and_wrong_variant_rejected(self):
        v = ProductVariant.objects.create(product=self.product, title='50ml', sku='TEST50', price=100, stock_level=0)
        other = Product.objects.create(title='Other', slug='other', sku='OTHER', price=100, is_online=True)
        wrong = ProductVariant.objects.create(product=other, sku='OTHER50', price=100)
        self.assertEqual(self.signup('restock').status_code, 400)
        self.assertEqual(self.signup('restock', variant_id=str(wrong.pk)).status_code, 400)
        self.assertEqual(self.signup('restock', variant_id=str(v.pk)).status_code, 200)
        sub = NotificationSubscription.objects.get()
        self.manage(sub, 'confirm')
        self.stock.stock_level = 100
        self.stock.save()
        self.assertEqual(process_notifications(), 0)
        v.stock_level = 1
        v.save()
        self.assertEqual(process_notifications(), 1)

    def test_invalid_email_missing_consent_stock_and_hidden_product(self):
        for payload in [{'email': 'bad'}, {'consent': False}, {'consent': None}, {'email': ['bad']}]:
            self.assertEqual(self.signup(**payload).status_code, 400)
        self.stock.stock_level = 1
        self.stock.save()
        self.assertEqual(self.signup('restock').status_code, 400)
        self.product.is_online = False
        self.product.save()
        self.assertEqual(self.signup('restock').status_code, 400)
        self.assertFalse(NotificationSubscription.objects.exists())

    def test_unsubscribe_prevents_delivery(self):
        self.signup('restock')
        sub = NotificationSubscription.objects.get()
        self.manage(sub, 'confirm')
        self.manage(sub, 'unsubscribe')
        self.stock.stock_level = 2
        self.stock.save()
        self.assertEqual(process_notifications(), 0)

    def test_delivery_failure_is_visible_and_not_blindly_retried(self):
        self.signup()
        with patch('apps.cms.notifications.send_mail', side_effect=TimeoutError):
            self.assertEqual(process_notifications(), 0)
        self.assertEqual(NotificationSubscription.objects.get().confirmation_state, 'unknown')
        self.assertEqual(process_notifications(), 0)

    @override_settings(CUSTOMER_NOTIFICATIONS_ENABLED=False)
    def test_delivery_disabled_preserves_queue(self):
        self.signup()
        self.assertEqual(process_notifications(), 0)
        self.assertEqual(NotificationSubscription.objects.get().confirmation_state, 'pending')

    def test_private_status_and_legacy_subscriber_preserved(self):
        NewsletterSubscriber.objects.create(email='person@example.com', is_active=True)
        self.signup()
        self.assertFalse(NotificationSubscription.objects.exists())
        r = self.client.get('/api/cms/newsletter/status/?email=person@example.com').json()
        self.assertFalse(r.get('data', r)['isSubscribed'])
        user = get_user_model().objects.create_user(email='person@example.com', password='testpassword')
        self.client.force_authenticate(user=user)
        r = self.client.get('/api/cms/newsletter/status/?email=somebodyelse@example.com').json()
        self.assertTrue(r.get('data', r)['isSubscribed'])

    def test_expiry_and_request_refresh_invalidates_old_link(self):
        self.signup()
        sub = NotificationSubscription.objects.get()
        NotificationSubscription.objects.filter(pk=sub.pk).update(requested_at=timezone.now()-timedelta(days=31))
        self.assertEqual(self.manage(sub, 'confirm').status_code, 400)
        self.assertEqual(self.signup().status_code, 200)
        self.assertEqual(self.manage(sub, 'confirm').status_code, 400)
        sub.refresh_from_db()
        self.assertEqual(self.manage(sub, 'confirm').status_code, 200)

    def test_invalid_management_payload(self):
        self.assertEqual(self.client.post('/api/cms/notifications/manage/', {'token': 'bad', 'action': 'confirm'}).status_code, 400)
