from django.test import TestCase
from rest_framework.test import APIClient
from apps.shop.models import AutoCollection, Product


class CollectionCountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.collection = AutoCollection.objects.create(name='Men', slug='gender/men', collection_type='gender')
        self.online = self.product('online')
        self.offline = self.product('offline', is_online=False)
        self.excluded = self.product('excluded')
        self.other = self.product('other', attributes={'gender': 'Women'})
        self.collection.excluded_products = [str(self.excluded.pk)]
        self.collection.save()
        self.collection.products.add(self.offline, self.other)

    def product(self, name, **kwargs):
        return Product.objects.create(title=name, slug=name, sku=name, price=100, **{'attributes': {'gender': 'Men'}, **kwargs})

    def data(self, path):
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        return response.json()['data']

    def assert_counts(self, expected):
        summary = next(c for c in self.data('/api/shop/collections/') if c['slug'] == 'gender/men')
        self.assertEqual(summary['product_count'], expected)
        for slug in ['men', 'gender/men']:
            detail = self.data(f'/api/shop/collections/{slug}/')
            self.assertEqual(detail['product_count'], expected)
            self.assertEqual(len(detail['products']), expected)

    def test_dynamic_membership_not_stale_saved_links(self):
        self.assert_counts(1)

    def test_publication_changes_are_immediate(self):
        self.assert_counts(1)
        self.offline.is_online = True
        self.offline.save()
        self.assert_counts(2)

    def test_manual_membership_filters_visibility_and_exclusions(self):
        self.collection.collection_type = 'manual'
        self.collection.save()
        self.collection.products.add(self.online, self.excluded)
        self.assert_counts(2)
        self.assertEqual(self.collection.products.count(), 4)

    def test_inactive_collection_remains_private(self):
        self.collection.status = 'draft'
        self.collection.save()
        self.assertEqual(self.client.get('/api/shop/collections/men/').status_code, 404)

    def test_unisex_title_in_all_three_gender_collections(self):
        shared = self.product('Luxury UnIsEx Perfume', attributes={})
        hidden = self.product('Hidden Unisex Perfume', is_online=False)
        for name in ['Men', 'Women', 'Unisex']:
            collection, _ = AutoCollection.objects.get_or_create(
                slug=f'gender/{name.lower()}', defaults={'name': name, 'collection_type': 'gender'})
            detail = self.data(f'/api/shop/collections/gender/{name.lower()}/')
            ids = [str(p['id']) for p in detail['products']]
            self.assertIn(str(shared.pk), ids)
            self.assertNotIn(str(hidden.pk), ids)
            self.assertEqual(len(ids), len(set(ids)))
            summary = next(c for c in self.data('/api/shop/collections/') if c['slug'] == collection.slug)
            self.assertEqual(summary['product_count'], len(ids))
            collection.excluded_products = [str(shared.pk)]
            collection.save()
            self.assertNotIn(str(shared.pk), [str(p['id']) for p in self.data(f'/api/shop/collections/{collection.slug}/')['products']])

    def test_unisex_title_does_not_expand_manual_collections(self):
        self.product('Unisex fragrance', attributes={})
        self.collection.collection_type = 'manual'
        self.collection.save()
        self.assert_counts(1)

    def test_title_edit_updates_membership_without_reimport(self):
        self.other.title = 'Women Unisex fragrance'
        self.other.save()
        self.assert_counts(2)
        self.other.title = 'Women fragrance'
        self.other.save()
        self.assert_counts(1)
