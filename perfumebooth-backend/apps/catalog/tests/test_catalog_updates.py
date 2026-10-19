import io
from PIL import Image
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.authentication.models import CustomUser, Role, UserRole
from apps.shop.models import Product, Inventory, AutoCollection


class CatalogUpdateVisibilityTests(TestCase):
    def test_merchant_update_refreshes_public_product_and_collection(self):
        with override_settings(
            STORAGES={'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'}},
        ):
            cache.clear()
            self.addCleanup(cache.clear)
            user = CustomUser.objects.create_user(email='catalog-test@example.com', password='Test123!')
            role, _ = Role.objects.get_or_create(name='Admin')
            UserRole.objects.create(user=user, role=role)
            product = Product.objects.create(title='Before', slug='catalog-test', sku='CAT-TEST', price=100, is_online=True)
            Inventory.objects.create(product=product, stock_level=5)
            collection = AutoCollection.objects.create(name='Test', slug='test', collection_type='manual')
            collection.products.add(product)
            public = APIClient()
            merchant = APIClient()
            merchant.force_authenticate(user)
            product_url = '/api/shop/products/catalog-test/'
            collection_url = '/api/shop/collections/test/'
            self.assertEqual(public.get(product_url).status_code, 200)
            self.assertEqual(public.get(collection_url).status_code, 200)
            data = io.BytesIO()
            Image.new('RGB', (16, 16), 'red').save(data, format='PNG')
            response = merchant.put(product_url, {
                'title': 'After', 'price': '250.00', 'compare_at_price': '300.00',
                'image': SimpleUploadedFile('catalog-test.png', data.getvalue(), content_type='image/png'),
            }, format='multipart')
            self.assertEqual(response.status_code, 200, response.data)
            def unwrap(response):
                body = response.json()
                return body['data'] if 'data' in body and 'meta' in body else body
            updated = unwrap(public.get(product_url))
            self.assertEqual(updated['title'], 'After')
            self.assertEqual(updated['price'], '250.00')
            self.assertIn('catalog-test', updated['image'])
            listed = unwrap(public.get(collection_url))['products']
            self.assertEqual(listed[0]['price'], '250.00')
            self.assertEqual(listed[0]['image'], updated['image'])
