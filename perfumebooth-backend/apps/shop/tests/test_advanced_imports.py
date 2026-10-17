from datetime import timedelta
from decimal import Decimal
from io import BytesIO

import openpyxl
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test import TransactionTestCase, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import CustomUser, Role, UserRole
from apps.inventory.models import InventoryMovement
from apps.shop.advanced_imports import cancel_schedule, run_due_imports, schedule_import, undo_import, validate_mapping
from apps.shop.models import Inventory, Product, ProductImportJob, ProductVariant
from apps.shop.product_imports import apply_preview, create_preview


class AdvancedImportTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email='phase7@example.com', password='test')
        UserRole.objects.create(user=self.user, role=Role.objects.create(name='Admin'))
        self.product = Product.objects.create(title='Rose Old', slug='rose', sku='ROSE', price='100.00', attributes={'brand': 'Old', 'tags': ['rose']})
        Inventory.objects.create(product=self.product, stock_level=10, reserved_stock=2)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def bulk(self, rows, products=None):
        book = openpyxl.Workbook()
        sheet = book.active
        sheet.title = 'Products'
        sheet.append(['Handle', 'Price', 'Brand'])
        for row in products or []:
            sheet.append(row)
        bulk = book.create_sheet('Bulk Actions')
        bulk.append(['Target Type', 'Identifier', 'Action', 'Value', 'Field', 'Find', 'Replace'])
        for row in rows:
            bulk.append(row)
        out = BytesIO(); book.save(out)
        return create_preview(SimpleUploadedFile('phase7.xlsx', out.getvalue()), self.user)

    def price_job(self):
        return self.bulk([['PRODUCT', 'rose', 'PRICE_PERCENT', '-10']])

    def test_price_stock_status_assignment_and_undo(self):
        job = self.bulk([
            ['PRODUCT', 'rose', 'PRICE_DELTA', '-5'], ['PRODUCT', 'rose', 'STOCK_DELTA', '4'],
            ['PRODUCT', 'rose', 'SET_STATUS', 'draft'], ['PRODUCT', 'rose', 'SET_BRAND', 'New'],
            ['PRODUCT', 'rose', 'SET_CATEGORY', 'Perfume'], ['PRODUCT', 'rose', 'ADD_TAGS', 'floral'],
            ['PRODUCT', 'rose', 'FIND_REPLACE', '', 'Title', 'Old', 'New'],
        ])
        self.assertFalse(job.errors)
        apply_preview(job.pk, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('95'))
        self.assertEqual(self.product.title, 'Rose New')
        self.assertEqual(self.product.attributes['brand'], 'New')
        self.assertEqual(self.product.attributes['category'], 'Perfume')
        self.assertEqual(self.product.attributes['tags'], ['rose', 'floral'])
        self.assertFalse(self.product.is_online)
        self.assertEqual(self.product.inventory.stock_level, 14)
        undo_import(job.pk, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('100'))
        self.assertEqual(self.product.title, 'Rose Old')
        self.assertEqual(self.product.attributes, {'brand': 'Old', 'tags': ['rose']})
        self.assertEqual(self.product.inventory.stock_level, 10)
        self.assertEqual(InventoryMovement.objects.count(), 2)
        undo_import(job.pk, self.user)
        self.assertEqual(InventoryMovement.objects.count(), 2)

    def test_price_set_and_tag_replacement(self):
        job = self.bulk([['PRODUCT', 'rose', 'PRICE_SET', '75'], ['PRODUCT', 'rose', 'SET_TAGS', 'new,new']])
        apply_preview(job.pk, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('75'))
        self.assertEqual(self.product.attributes['tags'], ['new'])

    def test_reject_nonfinite_overflow_and_negative_price(self):
        for value in ['NaN', 'Infinity', '-101', '99999999999999999']:
            with self.subTest(value=value):
                self.assertTrue(self.bulk([['PRODUCT', 'rose', 'PRICE_PERCENT', value]]).errors)

    def test_duplicate_and_sheet_conflicts(self):
        self.assertTrue(self.bulk([['PRODUCT', 'rose', 'PRICE_SET', '90'], ['PRODUCT', 'rose', 'PRICE_DELTA', '2']]).errors)
        self.assertTrue(self.bulk([['PRODUCT', 'rose', 'PRICE_SET', '90']], products=[['rose', '80']]).errors)

    def test_two_sheets_keep_different_attributes(self):
        job = self.bulk([['PRODUCT', 'rose', 'SET_CATEGORY', 'Attar']], products=[['rose', '', 'Changed']])
        apply_preview(job.pk, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.attributes['brand'], 'Changed')
        self.assertEqual(self.product.attributes['category'], 'Attar')
        undo_import(job.pk, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.attributes, {'brand': 'Old', 'tags': ['rose']})

    def test_find_replace_literal_and_blank_replacement(self):
        job = self.bulk([['PRODUCT', 'rose', 'FIND_REPLACE', '', 'Title', ' Old', '']])
        apply_preview(job.pk, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.title, 'Rose')
        self.assertTrue(self.bulk([['PRODUCT', 'rose', 'FIND_REPLACE', '', 'SKU', 'ROSE', 'X']]).errors)
        self.assertTrue(self.bulk([['PRODUCT', 'rose', 'FIND_REPLACE', '', 'Title', '', 'X']]).errors)

    def test_stock_reservations_rechecked_on_apply(self):
        job = self.bulk([['PRODUCT', 'rose', 'STOCK_DELTA', '-7']])
        Inventory.objects.filter(product=self.product).update(reserved_stock=4)
        with self.assertRaises(ValueError):
            apply_preview(job.pk, self.user)
        self.assertEqual(Inventory.objects.get(product=self.product).stock_level, 10)

    def test_undo_stock_conflict_is_atomic(self):
        job = self.bulk([['PRODUCT', 'rose', 'STOCK_DELTA', '10'], ['PRODUCT', 'rose', 'PRICE_SET', '50']])
        apply_preview(job.pk, self.user)
        Inventory.objects.filter(product=self.product).update(reserved_stock=11)
        with self.assertRaises(ValueError):
            undo_import(job.pk, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('50'))
        self.assertEqual(ProductImportJob.objects.count(), 1)

    def test_undo_refuses_later_edits(self):
        job = self.price_job(); apply_preview(job.pk, self.user)
        Product.objects.filter(pk=self.product.pk).update(price='80')
        with self.assertRaises(ValueError):
            undo_import(job.pk, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('80'))

    def test_variant_delta_snapshot(self):
        variant = ProductVariant.objects.create(product=self.product, sku='V1', price='50', stock_level=10)
        job = self.bulk([['VARIANT', 'V1', 'PRICE_PERCENT', '10'], ['VARIANT', 'V1', 'STOCK_DELTA', '-2']])
        apply_preview(job.pk, self.user)
        variant.refresh_from_db(); self.assertEqual(variant.price, Decimal('55')); self.assertEqual(variant.stock_level, 8)
        undo_import(job.pk, self.user)
        variant.refresh_from_db(); self.assertEqual(variant.price, Decimal('50')); self.assertEqual(variant.stock_level, 10)

    def test_schedule_sale_start_end_and_duplicate_ticks(self):
        job = self.price_job()
        start = timezone.now() + timedelta(hours=1); end = start + timedelta(hours=1)
        schedule_import(job.pk, self.user, start.isoformat(), end.isoformat())
        run_due_imports(start - timedelta(seconds=1))
        self.product.refresh_from_db(); self.assertEqual(self.product.price, Decimal('100'))
        run_due_imports(start); run_due_imports(start)
        self.product.refresh_from_db(); self.assertEqual(self.product.price, Decimal('90'))
        run_due_imports(end); run_due_imports(end)
        self.product.refresh_from_db(); self.assertEqual(self.product.price, Decimal('100'))
        job.refresh_from_db(); self.assertEqual(job.schedule_state, 'ended')

    def test_schedule_cannot_apply_manually(self):
        job = self.price_job(); start = timezone.now() + timedelta(hours=1)
        schedule_import(job.pk, self.user, start.isoformat())
        with self.assertRaises(ValueError): apply_preview(job.pk, self.user)
        response = self.client.post(f'/api/shop/products/excel-import/{job.pk}/apply/')
        self.assertEqual(response.status_code, 409)

    def test_schedule_stale_price_goes_to_review(self):
        job = self.price_job(); start = timezone.now() + timedelta(hours=1)
        schedule_import(job.pk, self.user, start.isoformat())
        Product.objects.filter(pk=self.product.pk).update(price='110')
        run_due_imports(start)
        job.refresh_from_db(); self.assertEqual(job.schedule_state, 'review')
        self.product.refresh_from_db(); self.assertEqual(self.product.price, Decimal('110'))

    def test_sale_end_conflict_does_not_overwrite(self):
        job = self.price_job(); start = timezone.now() + timedelta(hours=1); end = start + timedelta(hours=1)
        schedule_import(job.pk, self.user, start.isoformat(), end.isoformat()); run_due_imports(start)
        Product.objects.filter(pk=self.product.pk).update(price='70'); run_due_imports(end)
        job.refresh_from_db(); self.assertEqual(job.schedule_state, 'review')
        self.product.refresh_from_db(); self.assertEqual(self.product.price, Decimal('70'))

    def test_expired_window_is_not_started_late(self):
        job = self.price_job(); start = timezone.now() + timedelta(hours=1); end = start + timedelta(hours=1)
        schedule_import(job.pk, self.user, start.isoformat(), end.isoformat()); run_due_imports(end)
        job.refresh_from_db(); self.assertEqual(job.schedule_state, 'expired')
        self.product.refresh_from_db(); self.assertEqual(self.product.price, Decimal('100'))

    def test_schedule_dates_and_price_only(self):
        start = timezone.now() + timedelta(hours=1)
        for date in ['garbage', start.replace(tzinfo=None).isoformat(), timezone.now().isoformat()]:
            with self.assertRaises(ValueError): schedule_import(self.price_job().pk, self.user, date)
        with self.assertRaises(ValueError): schedule_import(self.price_job().pk, self.user, start.isoformat(), start.isoformat())
        stock = self.bulk([['PRODUCT', 'rose', 'STOCK_DELTA', '1']])
        with self.assertRaises(ValueError): schedule_import(stock.pk, self.user, start.isoformat())

    def test_cancel_schedule(self):
        job = self.price_job(); start = timezone.now() + timedelta(hours=1)
        schedule_import(job.pk, self.user, start.isoformat()); cancel_schedule(job.pk, self.user); run_due_imports(start)
        self.product.refresh_from_db(); self.assertEqual(self.product.price, Decimal('100'))

    def test_owner_and_role_protection(self):
        other = CustomUser.objects.create_user(email='other@example.com', password='test')
        job = self.price_job(); apply_preview(job.pk, self.user)
        with self.assertRaises(PermissionError): undo_import(job.pk, other)
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get('/api/shop/products/advanced-import/mappings/').status_code, 403)
        UserRole.objects.create(user=other, role=Role.objects.get(name='Admin'))
        self.assertEqual(self.client.post(f'/api/shop/products/advanced-import/{job.pk}/undo/').status_code, 403)

    def test_mapping_validation_and_application(self):
        for value in [[], {'A': 'bad'}, {'A': 'price', 'B': 'price'}]:
            with self.assertRaises(ValueError): validate_mapping(value)
        response = self.client.post('/api/shop/products/advanced-import/mappings/', {'name': 'Supplier', 'columns': {'Code': 'sku', 'Retail': 'price'}}, format='json')
        self.assertEqual(response.status_code, 200)
        from apps.shop.models import ImportMapping
        mapping = ImportMapping.objects.get(pk=response.data.get('data', response.data)['id'])
        job = ProductImportJob.objects.create(created_by=self.user, filename='mapped.csv', file_sha256='', status='queued', column_mapping=mapping.columns)
        create_preview(SimpleUploadedFile('mapped.csv', b'Code,Retail\nROSE,130\n'), self.user, job=job)
        self.assertFalse(job.errors)
        apply_preview(job.pk, self.user)
        self.product.refresh_from_db(); self.assertEqual(self.product.price, Decimal('130'))

    def test_no_undo_for_destructive_import(self):
        job = ProductImportJob.objects.create(created_by=self.user, filename='old', file_sha256='', status='applied')
        with self.assertRaises(ValueError): undo_import(job.pk, self.user)

    def test_history_is_compact_and_owner_scoped(self):
        job = self.price_job(); apply_preview(job.pk, self.user)
        response = self.client.get('/api/v1/admin/products/advanced-import/history/')
        self.assertEqual(response.status_code, 200)
        jobs = response.data.get('data', response.data)['jobs']
        self.assertEqual(jobs[0]['job_id'], str(job.pk))
        self.assertTrue(jobs[0]['can_undo'])
        self.assertNotIn('changes', jobs[0])
        self.assertNotIn('snapshot', jobs[0])

    def test_missing_mapping_source_is_invalid(self):
        job = ProductImportJob.objects.create(created_by=self.user, filename='mapped.csv', file_sha256='', status='queued', column_mapping={'Missing': 'price'})
        create_preview(SimpleUploadedFile('mapped.csv', b'Handle,Brand\nrose,Other\n'), self.user, job=job)
        self.assertEqual(job.status, 'invalid')

    def test_disabled_owner_cannot_start_sale(self):
        job = self.price_job(); start = timezone.now() + timedelta(hours=1)
        schedule_import(job.pk, self.user, start.isoformat())
        CustomUser.objects.filter(pk=self.user.pk).update(is_active=False)
        run_due_imports(start); job.refresh_from_db()
        self.assertEqual(job.schedule_state, 'review')


@skipUnlessDBFeature('has_select_for_update')
class AdvancedImportConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email='parallel@example.com', password='test')
        role, _ = Role.objects.get_or_create(name='Admin')
        UserRole.objects.create(user=self.user, role=role)
        self.product = Product.objects.create(title='Concurrent', slug='concurrent', sku='CONCURRENT', price='100')
        self.job = create_preview(SimpleUploadedFile('prices.csv', b'Handle,Price\nconcurrent,90\n'), self.user)

    def parallel(self, function):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier
        from django.db import close_old_connections, connections
        barrier = Barrier(2)
        def run():
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return function()
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(run) for _ in range(2)]
            for future in futures:
                future.result(timeout=30)

    def test_concurrent_scheduler_ticks_apply_once(self):
        start = timezone.now() + timedelta(hours=1)
        schedule_import(self.job.pk, self.user, start.isoformat())
        self.parallel(lambda: run_due_imports(start))
        self.product.refresh_from_db(); self.job.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('90'))
        self.assertEqual(self.job.schedule_state, 'completed')

    def test_concurrent_undo_creates_one_reversal(self):
        apply_preview(self.job.pk, self.user)
        self.parallel(lambda: undo_import(self.job.pk, self.user))
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('100'))
        self.assertEqual(ProductImportJob.objects.count(), 2)
