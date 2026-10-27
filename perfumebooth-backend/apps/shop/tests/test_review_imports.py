from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.shop.models import Product, ProductReview
from apps.shop.review_imports import import_reviews


class ReviewImportTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(title='Test perfume', slug='test-perfume', price='100', is_online=True)
        self.row = {'id': 91, 'product_handle': 'test-perfume', 'rating': 4,
                    'body': 'Original review', 'reviewer_name': 'Original Name',
                    'created_at': '2022-03-04T12:30:45.123Z', 'published': True, 'verified': False}

    def run_import(self, rows=None, **kwargs):
        return import_reviews(rows if rows is not None else [self.row], 'old-store.myshopify.com', **kwargs)

    def test_dry_run_writes_nothing(self):
        self.assertEqual(self.run_import()['ready'], 1)
        self.assertEqual(ProductReview.objects.count(), 0)
        self.assertEqual(get_user_model().objects.count(), 0)

    def test_preserves_history_and_creates_no_accounts(self):
        self.assertEqual(self.run_import(dry_run=False)['created'], 1)
        review = ProductReview.objects.get()
        self.assertEqual(review.created_at.year, 2022)
        self.assertEqual(review.created_at.microsecond, 123000)
        self.assertEqual(review.rating, 4)
        self.assertEqual(review.display_name, 'Original Name')
        self.assertFalse(review.is_verified_buyer)
        self.assertTrue(review.is_approved)
        self.assertIsNone(review.user_id)
        self.assertEqual(get_user_model().objects.count(), 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.attributes['rating_count'], 1)

    def test_rerun_does_not_duplicate_or_override_moderation(self):
        self.run_import(dry_run=False)
        ProductReview.objects.update(is_approved=False)
        self.assertEqual(self.run_import(dry_run=False)['duplicates'], 1)
        self.assertFalse(ProductReview.objects.get().is_approved)

    def test_bad_mapping_blocks_entire_batch(self):
        bad = {**self.row, 'id': 92, 'product_handle': 'test'}
        result = self.run_import([self.row, bad], dry_run=False)
        self.assertEqual(len(result['errors']), 1)
        self.assertFalse(ProductReview.objects.exists())

    def test_false_and_unknown_status_never_become_verified_or_published(self):
        for index, value in enumerate(['false', 'nothing', '', 'unverified']):
            self.run_import([{**self.row, 'id': index, 'verified': value, 'published': False}], dry_run=False)
        self.assertEqual(ProductReview.objects.count(), 4)
        self.assertFalse(ProductReview.objects.filter(is_approved=True).exists())
        self.assertFalse(ProductReview.objects.filter(is_verified_buyer=True).exists())

    def test_invalid_rating_and_date_rejected(self):
        for changes in [{'rating': 8}, {'rating': ''}, {'created_at': 'invalid'}]:
            result = self.run_import([{**self.row, **changes}], dry_run=False)
            self.assertEqual(len(result['errors']), 1)
        self.assertFalse(ProductReview.objects.exists())

    def test_idless_export_is_order_independent(self):
        row = {k: v for k, v in self.row.items() if k != 'id'}
        self.run_import([row, row], dry_run=False)
        self.assertEqual(self.run_import([row], dry_run=False)['duplicates'], 1)
        self.assertEqual(ProductReview.objects.count(), 1)

    def test_native_endpoint_displays_imports_but_not_hidden_reviews(self):
        self.run_import([self.row, {**self.row, 'id': 92, 'published': False}], dry_run=False)
        response = APIClient().get(f'/api/shop/products/{self.product.slug}/reviews/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['review_count'], 1)
        self.assertEqual(response.data['data']['reviews'][0]['user_name'], 'Original Name')

    def test_explicit_id_mapping(self):
        row = {**self.row, 'product_handle': '', 'product_id': 1234}
        self.assertEqual(self.run_import([row], product_map={'1234': self.product.slug})['ready'], 1)
