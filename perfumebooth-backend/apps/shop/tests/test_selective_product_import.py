from decimal import Decimal
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test import RequestFactory

from apps.authentication.models import CustomUser
from apps.inventory.models import InventoryMovement
from apps.shop.models import Collection, Inventory, Product, ProductImage, ProductImportJob, ProductVariant
from apps.shop.product_imports import apply_preview, create_preview
from apps.shop.product_import_template import HEADERS, TEMPLATE_VERSION, build_product_import_template
from apps.shop.tasks import apply_catalog_import_job, process_catalog_preview_job
from apps.shop.views import ProductExcelExportView
from openpyxl import load_workbook
from io import BytesIO


class SelectiveProductImportTests(TestCase):
    @patch('celery.result.AsyncResult')
    def test_status_survives_result_backend_outage(self, result):
        from apps.shop.views import ProductExcelImportStatusView
        job = ProductImportJob.objects.create(
            created_by=self.user, filename='status.csv', file_sha256='',
            status='applying', task_id='offline-result', progress_current=20, progress_total=105,
        )
        result.side_effect = ConnectionError('Result store unavailable')
        request = RequestFactory().get('/')
        request.user = self.user
        response = ProductExcelImportStatusView().get(request, job.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['progress'], {'current': 20, 'total': 105})

    def setUp(self):
        self.user = CustomUser.objects.create_user(email='importer@example.com', password='test')
        self.product = Product.objects.create(
            title='Original', slug='original', sku='SKU-1', price=Decimal('100.00'),
            compare_at_price=Decimal('120.00'), attributes={'brand': 'Old', 'tags': ['classic']},
        )
        Inventory.objects.create(product=self.product, stock_level=10, reserved_stock=2)
        self.other = Product.objects.create(title='Untouched', slug='untouched', sku='SKU-2', price=Decimal('50.00'))

    def csv(self, content):
        return SimpleUploadedFile('updates.csv', content.encode(), content_type='text/csv')

    def test_preview_does_not_write_and_apply_changes_only_supplied_nonblank_fields(self):
        job = create_preview(self.csv('Handle,Title,Price,Stock,Brand\noriginal,,125.50,20,New Brand\n'), self.user)
        self.product.refresh_from_db(); self.other.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('100.00'))
        self.assertEqual(self.product.title, 'Original')
        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY)
        self.assertEqual(job.summary['changed_products'], 1)

        apply_preview(job.id, self.user)
        self.product.refresh_from_db(); self.other.refresh_from_db()
        self.assertEqual(self.product.title, 'Original')
        self.assertEqual(self.product.price, Decimal('125.50'))
        self.assertEqual(self.product.inventory.stock_level, 20)
        self.assertEqual(self.product.inventory.reserved_stock, 2)
        self.assertEqual(self.product.attributes['brand'], 'New Brand')
        self.assertEqual(self.other.price, Decimal('50.00'))
        movement = InventoryMovement.objects.get(product=self.product)
        self.assertEqual(movement.stock_delta, 10)

    def test_clear_marker_and_blank_have_different_meanings(self):
        job = create_preview(self.csv('SKU,Compare At Price,Tags\nSKU-1,__CLEAR__,\n'), self.user)
        apply_preview(job.id, self.user)
        self.product.refresh_from_db()
        self.assertIsNone(self.product.compare_at_price)
        self.assertEqual(self.product.attributes['tags'], ['classic'])

    def test_unmatched_product_is_error_and_never_created(self):
        job = create_preview(self.csv('SKU,Price\nMISSING,10\n'), self.user)
        self.assertEqual(job.status, ProductImportJob.Status.INVALID)
        self.assertEqual(job.summary['unmatched_rows'], 1)
        self.assertFalse(Product.objects.filter(sku='MISSING').exists())
        with self.assertRaises(ValueError):
            apply_preview(job.id, self.user)

    def test_invalid_value_blocks_entire_import(self):
        job = create_preview(self.csv('SKU,Price\nSKU-1,not-money\n'), self.user)
        self.assertEqual(job.summary['invalid_rows'], 1)
        with self.assertRaises(ValueError):
            apply_preview(job.id, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('100.00'))

    def test_stale_preview_is_rejected(self):
        job = create_preview(self.csv('SKU,Price\nSKU-1,125\n'), self.user)
        self.product.price = Decimal('110.00'); self.product.save(update_fields=['price'])
        with self.assertRaisesRegex(ValueError, 'changed after preview'):
            apply_preview(job.id, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('110.00'))

    def test_same_product_twice_is_rejected(self):
        job = create_preview(self.csv('SKU,Price\nSKU-1,125\nSKU-1,130\n'), self.user)
        self.assertEqual(job.status, ProductImportJob.Status.INVALID)
        self.assertTrue(any('Duplicate SKU' in item['message'] for item in job.errors))

    def test_template_contains_guidance_examples_protection_and_validations(self):
        workbook = load_workbook(BytesIO(build_product_import_template()), data_only=False)
        self.assertEqual(workbook.sheetnames, ['Instructions', 'Products', 'Variants', 'Images', 'Bulk Actions', 'Examples', '_Template'])
        self.assertEqual(workbook['_Template']['B1'].value, TEMPLATE_VERSION)
        self.assertEqual(workbook['_Template'].sheet_state, 'hidden')
        products = workbook['Products']
        self.assertEqual([cell.value for cell in products[1]], HEADERS)
        self.assertEqual(products.freeze_panes, 'A2')
        self.assertTrue(products.protection.sheet)
        self.assertTrue(products['A1'].protection.locked)
        self.assertFalse(products['A2'].protection.locked)
        self.assertTrue(products.cell(2, len(HEADERS)).protection.locked)
        self.assertGreaterEqual(len(products.data_validations.dataValidation), 6)
        self.assertEqual(workbook['Examples']['A2'].value, 'oud-noir')
        variants = workbook['Variants']
        self.assertEqual(variants['A1'].value, 'Product Handle')
        self.assertTrue(variants.protection.sheet)
        self.assertGreaterEqual(len(variants.data_validations.dataValidation), 5)
        images = workbook['Images']
        self.assertEqual(images['A1'].value, 'Product Handle')
        self.assertTrue(images.protection.sheet)
        self.assertTrue(workbook['Bulk Actions'].protection.sheet)

    def test_gender_is_validated_and_updated(self):
        job = create_preview(self.csv('SKU,Gender\nSKU-1,unisex\n'), self.user)
        apply_preview(job.id, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.attributes['gender'], 'Unisex')

    def test_create_only_previews_then_creates_draft_with_defaults_and_generated_slug(self):
        job = create_preview(
            self.csv('SKU,Title,Price,Stock,Gender\nNEW-1,Amber Night,799.00,12,Unisex\n'),
            self.user, mode='CREATE_ONLY', draft_default=True,
        )
        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY)
        self.assertEqual(job.summary['created_products'], 1)
        self.assertFalse(Product.objects.filter(sku='NEW-1').exists())
        apply_preview(job.id, self.user)
        created = Product.objects.get(sku='NEW-1')
        self.assertEqual(created.slug, 'amber-night')
        self.assertFalse(created.is_online)
        self.assertEqual(created.attributes['brand'], 'PerfumeBooth')
        self.assertIn('Unisex', created.attributes['tags'])
        self.assertEqual(created.inventory.stock_level, 12)

    def test_create_only_rejects_existing_product(self):
        job = create_preview(
            self.csv('SKU,Title,Price\nSKU-1,Replacement,10\n'), self.user, mode='CREATE_ONLY'
        )
        self.assertEqual(job.status, ProductImportJob.Status.INVALID)
        self.assertTrue(any('CREATE_ONLY' in error['message'] for error in job.errors))

    def test_upsert_updates_existing_and_creates_missing_in_one_transaction(self):
        job = create_preview(
            self.csv('SKU,Title,Price\nSKU-1,,125.00\nNEW-2,Fresh Rose,450.00\n'),
            self.user, mode='UPSERT', draft_default=False,
        )
        self.assertEqual(job.summary['updated_products'], 1)
        self.assertEqual(job.summary['created_products'], 1)
        apply_preview(job.id, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('125.00'))
        self.assertTrue(Product.objects.get(sku='NEW-2').is_online)

    def test_create_requires_sku_title_and_price(self):
        job = create_preview(self.csv('SKU,Title,Price\n,Missing Price,\n'), self.user, mode='CREATE_ONLY')
        self.assertEqual(job.status, ProductImportJob.Status.INVALID)
        messages = ' '.join(error['message'] for error in job.errors)
        self.assertIn('SKU is required', messages)
        self.assertIn('Price is required', messages)

    def test_duplicate_sku_in_file_blocks_creation(self):
        job = create_preview(
            self.csv('SKU,Title,Price\nSAME,One,10\nSAME,Two,20\n'), self.user, mode='CREATE_ONLY'
        )
        self.assertEqual(job.status, ProductImportJob.Status.INVALID)
        self.assertTrue(any('Duplicate SKU' in error['message'] for error in job.errors))

    def test_generated_template_round_trip_uses_products_sheet(self):
        workbook = load_workbook(BytesIO(build_product_import_template('CREATE_ONLY')))
        products = workbook['Products']
        products['B2'] = 'ROUNDTRIP-1'
        products['C2'] = 'Template Product'
        products['D2'] = 325
        output = BytesIO(); workbook.save(output)
        upload = SimpleUploadedFile(
            'template.xlsx', output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        job = create_preview(upload, self.user, mode='CREATE_ONLY')
        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY)
        self.assertEqual(job.summary['created_products'], 1)
        apply_preview(job.id, self.user)
        self.assertTrue(Product.objects.filter(sku='ROUNDTRIP-1', slug='template-product').exists())

    def variant_workbook(self, product_rows=None, variant_rows=None, image_rows=None, bulk_rows=None):
        workbook = load_workbook(BytesIO(build_product_import_template('UPSERT')))
        products = workbook['Products']
        variants = workbook['Variants']
        images = workbook['Images']
        bulk_actions = workbook['Bulk Actions']
        for row in product_rows or []:
            products.append(row)
        for row in variant_rows or []:
            variants.append(row)
        for row in image_rows or []:
            images.append(row)
        for row in bulk_rows or []:
            bulk_actions.append(row)
        output = BytesIO(); workbook.save(output)
        return SimpleUploadedFile(
            'variants.xlsx', output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )

    def test_variant_add_update_and_delete_are_previewed_and_applied(self):
        add_job = create_preview(self.variant_workbook(variant_rows=[
            ['original', 'ADD', 'SKU-1-50', '50 ml', 'Volume', '50 ml', '', '', 130, 150, 8, 'active'],
        ]), self.user, mode='UPSERT')
        self.assertEqual(add_job.summary['variants_to_add'], 1)
        apply_preview(add_job.id, self.user)
        variant = ProductVariant.objects.get(sku='SKU-1-50')
        self.assertEqual(variant.stock_level, 8)
        self.assertTrue(variant.is_active)

        update_job = create_preview(self.variant_workbook(variant_rows=[
            ['original', 'UPDATE', 'SKU-1-50', '', '', '', '', '', 140, '', '', 'draft'],
        ]), self.user, mode='UPSERT')
        apply_preview(update_job.id, self.user)
        variant.refresh_from_db()
        self.assertEqual(variant.price, Decimal('140.00'))
        self.assertEqual(variant.stock_level, 8)
        self.assertFalse(variant.is_active)

        delete_job = create_preview(self.variant_workbook(variant_rows=[
            ['original', 'DELETE', 'SKU-1-50'],
        ]), self.user, mode='UPSERT')
        self.assertEqual(delete_job.summary['variants_to_delete'], 1)
        apply_preview(delete_job.id, self.user)
        self.assertFalse(ProductVariant.objects.filter(sku='SKU-1-50').exists())

    def test_variant_can_link_to_product_created_in_same_workbook(self):
        job = create_preview(self.variant_workbook(
            product_rows=[['new-set', 'NEW-SET', 'New Set', 500]],
            variant_rows=[['new-set', 'ADD', 'NEW-SET-100', '100 ml', 'Volume', '100 ml', '', '', 550, '', 4, 'active']],
        ), self.user, mode='UPSERT')
        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY)
        apply_preview(job.id, self.user)
        self.assertEqual(ProductVariant.objects.get(sku='NEW-SET-100').product.slug, 'new-set')

    def test_variant_delete_with_reserved_stock_is_blocked(self):
        ProductVariant.objects.create(
            product=self.product, title='Reserved', option1_name='Volume', option1_value='30 ml',
            sku='RESERVED-30', price=Decimal('100.00'), stock_level=5, reserved_stock=1,
        )
        job = create_preview(self.variant_workbook(variant_rows=[
            ['original', 'DELETE', 'RESERVED-30'],
        ]), self.user, mode='UPSERT')
        self.assertEqual(job.status, ProductImportJob.Status.INVALID)
        self.assertTrue(any('active inventory reservations' in error['message'] for error in job.errors))

    def test_variant_sku_cannot_collide_with_product_sku(self):
        job = create_preview(self.variant_workbook(variant_rows=[
            ['original', 'ADD', 'SKU-2', '50 ml', 'Volume', '50 ml', '', '', 100, '', 1, 'active'],
        ]), self.user, mode='UPSERT')
        self.assertEqual(job.status, ProductImportJob.Status.INVALID)
        self.assertTrue(any('already belongs' in error['message'] for error in job.errors))

    def test_background_preview_and_apply_are_idempotent(self):
        upload = self.csv('SKU,Price\nSKU-1,175.00\n')
        job = ProductImportJob.objects.create(
            created_by=self.user, filename=upload.name, file_sha256='', mode='UPDATE_ONLY',
            status=ProductImportJob.Status.QUEUED, summary={'draft_default': True}, source_file=upload,
        )
        preview_result = process_catalog_preview_job.apply(args=[str(job.id)]).get()
        job.refresh_from_db()
        self.assertEqual(preview_result['status'], ProductImportJob.Status.PREVIEW_READY)
        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY)
        job.status = ProductImportJob.Status.APPLY_QUEUED
        job.save(update_fields=['status'])
        first_result = apply_catalog_import_job.apply(args=[str(job.id)]).get()
        second_result = apply_catalog_import_job.apply(args=[str(job.id)]).get()
        self.product.refresh_from_db()
        self.assertEqual(first_result['status'], ProductImportJob.Status.APPLIED)
        self.assertEqual(second_result['status'], ProductImportJob.Status.APPLIED)
        self.assertEqual(self.product.price, Decimal('175.00'))

    @patch('apps.shop.product_imports.download_catalog_image')
    def test_product_image_add_is_previewed_and_applied(self, download_image):
        download_image.return_value = (b'image-bytes', 'image.jpg', 800, 800)
        job = create_preview(self.variant_workbook(image_rows=[
            ['original', '', 'ADD', 'https://cdn.example.com/oud.jpg', '', 'Oud bottle', 1, 'yes'],
        ]), self.user, mode='UPSERT')
        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY)
        self.assertEqual(job.summary['images_to_add'], 1)
        progress = []
        apply_preview(job.id, self.user, progress_callback=lambda current, total: progress.append((current, total)))
        self.assertEqual(progress[0], (0, 6))
        self.assertEqual(progress[-1], (6, 6))
        self.assertEqual([current for current, _ in progress], sorted(current for current, _ in progress))
        self.assertTrue(all(total == 6 for _, total in progress))
        image = ProductImage.objects.get(product=self.product)
        self.assertTrue(image.is_primary)
        self.assertEqual(image.position, 1)
        self.assertEqual(image.width, 800)
        self.product.refresh_from_db()
        self.assertTrue(bool(self.product.image))

    @patch('apps.shop.product_imports.download_catalog_image')
    def test_concurrent_image_download_progress_reported(self, download_image):
        download_image.return_value = (b'image-bytes', 'image.jpg', 800, 800)
        job = create_preview(self.variant_workbook(image_rows=[
            ['original', '', 'ADD', 'https://cdn.example.com/oud1.jpg', '', 'Img 1', 1, 'yes'],
            ['original', '', 'ADD', 'https://cdn.example.com/oud2.jpg', '', 'Img 2', 2, 'no'],
        ]), self.user, mode='UPSERT')
        progress_calls = []
        apply_preview(job.id, self.user, progress_callback=lambda c, t: progress_calls.append((c, t)))
        self.assertEqual(ProductImage.objects.filter(product=self.product).count(), 2)
        self.assertIn((2, 7), progress_calls)
        self.assertEqual(progress_calls[-1], (7, 7))

    @patch('apps.shop.product_imports.download_catalog_image')
    def test_variant_image_replace_and_delete(self, download_image):
        download_image.return_value = (b'image-bytes', 'variant.jpg', 400, 400)
        variant = ProductVariant.objects.create(
            product=self.product, title='50 ml', option1_value='50 ml', sku='IMG-50',
            price=Decimal('110.00'),
        )
        replace_job = create_preview(self.variant_workbook(image_rows=[
            ['original', 'IMG-50', 'REPLACE', 'https://cdn.example.com/50.jpg'],
        ]), self.user, mode='UPSERT')
        apply_preview(replace_job.id, self.user)
        variant.refresh_from_db()
        self.assertTrue(bool(variant.image))
        delete_job = create_preview(self.variant_workbook(image_rows=[
            ['original', 'IMG-50', 'DELETE'],
        ]), self.user, mode='UPSERT')
        apply_preview(delete_job.id, self.user)
        variant.refresh_from_db()
        self.assertFalse(bool(variant.image))

    def test_advanced_bulk_price_stock_status_tags_and_collection(self):
        collection = Collection.objects.create(title='Featured', slug='featured', match_type='manual')
        job = create_preview(self.variant_workbook(bulk_rows=[
            ['PRODUCT', 'original', 'PRICE_PERCENT', 10],
            ['PRODUCT', 'original', 'STOCK_DELTA', -5],
            ['PRODUCT', 'original', 'SET_STATUS', 'draft'],
            ['PRODUCT', 'original', 'ADD_TAGS', 'new, seasonal'],
            ['PRODUCT', 'original', 'ADD_COLLECTION', 'featured'],
        ]), self.user, mode='UPSERT')
        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY)
        self.assertEqual(job.summary['bulk_actions'], 5)
        apply_preview(job.id, self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('110.00'))
        self.assertEqual(self.product.inventory.stock_level, 5)
        self.assertFalse(self.product.is_online)
        self.assertEqual(self.product.attributes['tags'], ['classic', 'new', 'seasonal'])
        self.assertTrue(collection.products.filter(pk=self.product.pk).exists())

    def test_advanced_bulk_variant_and_reserved_stock_safety(self):
        variant = ProductVariant.objects.create(
            product=self.product, title='50 ml', option1_value='50 ml', sku='BULK-50',
            price=Decimal('100.00'), stock_level=5, reserved_stock=2,
        )
        valid = create_preview(self.variant_workbook(bulk_rows=[
            ['VARIANT', 'BULK-50', 'PRICE_DELTA', -10],
            ['VARIANT', 'BULK-50', 'SET_STATUS', 'draft'],
        ]), self.user, mode='UPSERT')
        apply_preview(valid.id, self.user)
        variant.refresh_from_db()
        self.assertEqual(variant.price, Decimal('90.00'))
        self.assertFalse(variant.is_active)
        invalid = create_preview(self.variant_workbook(bulk_rows=[
            ['VARIANT', 'BULK-50', 'STOCK_DELTA', -4],
        ]), self.user, mode='UPSERT')
        self.assertEqual(invalid.status, ProductImportJob.Status.INVALID)
        self.assertTrue(any('reserved stock' in error['message'] for error in invalid.errors))

    def test_catalog_export_uses_v7_round_trip_sheets_and_image_ids(self):
        variant = ProductVariant.objects.create(
            product=self.product, title='50 ml', option1_value='50 ml', sku='EXPORT-50',
            price=Decimal('105.00'), image='variants/export-50.jpg',
        )
        image = ProductImage.objects.create(
            product=self.product, image='products/export.jpg', alt_text='Export image',
            position=2, is_primary=True,
        )
        request = RequestFactory().get('/api/shop/products/excel-export/', HTTP_HOST='testserver')
        response = ProductExcelExportView().get(request)
        workbook = load_workbook(BytesIO(response.content), data_only=False)
        exported_handles = [row[0] for row in workbook['Products'].iter_rows(min_row=2, values_only=True)]
        self.assertIn('original', exported_handles)
        self.assertIn('untouched', exported_handles)
        self.assertEqual(workbook['Variants']['C2'].value, variant.sku)
        image_ids = [workbook['Images'].cell(row, 5).value for row in range(2, 5)]
        self.assertIn(str(image.id), image_ids)
        self.assertIn('perfumebooth-catalog-v8.xlsx', response['Content-Disposition'])

    def test_shopify_csv_is_normalized_into_products_variants_images_and_perfume_attributes(self):
        content = (
            'Handle,Title,Body (HTML),Vendor,Product Category,Type,Brand Name,Published,'
            'Option1 Name,Option1 Value,Option2 Name,Option2 Value,Variant SKU,Variant Grams,'
            'Variant Price,Variant Compare At Price,Variant Inventory Qty,Image Src,Image Position,'
            'Image Alt Text,SEO Title,SEO Description,Status,'
            'Filter: Gender (product.metafields.custom.gender),'
            'Idealfor (product.metafields.custom.idealfor),'
            'topnotes (product.metafields.custom.topnotes),'
            'middlenote (product.metafields.custom.middlenote),'
            'basenotes (product.metafields.custom.basenotes),'
            'size (product.metafields.custom.size)\n'
            'amber-night,Amber Night,<p>Warm amber</p>,Perfume Booth,Perfume,Eau de Parfum,Canéza,True,'
            'Size,50 ml,,,AMBER-50,500,799,999,7,https://cdn.example.com/amber-1.jpg,1,Amber bottle,'
            'Amber Night perfume,Warm amber perfume,active,Male,Evening,Bergamot,Rose,Amber,50 ml\n'
            'amber-night,,,,,,,,Size,100 ml,,,AMBER-100,600,1199,1399,4,'
            'https://cdn.example.com/amber-2.jpg,2,Amber bottle large,,,,,,,,,\n'
        )
        upload = SimpleUploadedFile('shopify.csv', content.encode('utf-8'), content_type='text/csv')
        job = create_preview(upload, self.user, mode='CREATE_ONLY', draft_default=True)

        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY, job.errors)
        self.assertEqual(job.summary['created_products'], 1)
        self.assertEqual(job.summary['variants_to_add'], 2)
        self.assertEqual(job.summary['images_to_add'], 2)
        payload = job.creates[0]
        self.assertTrue(payload['sku'].startswith('PB-AMBERNIGHT-'))
        self.assertEqual(payload['brand'], 'Canéza')
        self.assertEqual(payload['gender'], 'Men')
        self.assertEqual(payload['top_notes'], 'Bergamot')

        with patch('apps.shop.product_imports.download_catalog_image') as download_image:
            download_image.return_value = (b'image-bytes', 'image.jpg', 800, 800)
            apply_preview(job.id, self.user)

        product = Product.objects.get(slug='amber-night')
        self.assertEqual(product.description, '<p>Warm amber</p>')
        self.assertEqual(product.attributes['brand'], 'Canéza')
        self.assertEqual(product.attributes['base_notes'], 'Amber')
        self.assertEqual(product.attributes['weight'], '0.5')
        self.assertEqual(product.variants.count(), 2)
        self.assertEqual(product.images.count(), 2)

    def test_shopify_single_default_variant_uses_source_sku_without_extra_variant(self):
        content = (
            'Handle,Title,Variant SKU,Variant Price,Option1 Name,Option1 Value,Image Src,Status\n'
            'single,Single Perfume,SINGLE-1,500,Title,Default Title,https://cdn.example.com/single.jpg,active\n'
        )
        upload = SimpleUploadedFile('shopify.csv', content.encode(), content_type='text/csv')
        job = create_preview(upload, self.user, mode='CREATE_ONLY')
        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY, job.errors)
        self.assertEqual(job.creates[0]['sku'], 'SINGLE-1')
        self.assertEqual(job.summary['variants_to_add'], 0)

    def test_cost_per_item_is_private_model_data_not_public_attributes(self):
        job = create_preview(
            self.csv('SKU,Title,Price,Cost Per Item\nPRIVATE-COST,Private Cost,500,275.50\n'),
            self.user, mode='CREATE_ONLY',
        )
        self.assertEqual(job.status, ProductImportJob.Status.PREVIEW_READY, job.errors)
        apply_preview(job.id, self.user)
        product = Product.objects.get(sku='PRIVATE-COST')
        self.assertEqual(product.cost_per_item, Decimal('275.50'))
        self.assertNotIn('cost_per_item', product.attributes)
