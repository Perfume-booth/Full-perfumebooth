import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError
from apps.authentication.models import CustomUser, Role, UserRole
from apps.orders.models import Order, OrderItem, Shipment
from apps.shop.models import Product, ProductVariant, Inventory
from apps.shop.report_catalog import CATALOG, report_data, TZ


class ReportCatalogTests(TestCase):
    now = datetime(2026, 10, 21, 12, tzinfo=TZ)
    params = {'start': '2026-10-01', 'end': '2026-10-21'}

    def setUp(self):
        self.product = Product.objects.create(title='Perfume, "Gold"', slug='gold', sku='=GOLD', price=100, cost_per_item=30)
        Inventory.objects.create(product=self.product, stock_level=20, reserved_stock=2)
        self.order = Order.objects.create(order_number='R-1', subtotal=200, discount_amount=20,
            tax_amount=10, shipping_amount=5, total=195, payment_status='Paid', status='Delivered',
            customer_email='buyer@example.test', shipping_address={'city':'Delhi','country':'India'})
        Order.objects.filter(pk=self.order.pk).update(created_at=self.now-timedelta(days=1))
        self.order.refresh_from_db()
        self.item = OrderItem.objects.create(order=self.order, product=self.product, product_title=self.product.title,
            sku=self.product.sku, quantity=2, unit_price=100, unit_cost_snapshot=30, brand_snapshot='Brand')

    def report(self, key):
        return report_data(key, self.params, self.now)

    def test_every_available_report_executes(self):
        for spec in CATALOG:
            with self.subTest(report=spec['id']):
                output = self.report(spec['id'])
                self.assertEqual(output['status'], spec['status'])
                if spec['status'] == 'available':
                    self.assertTrue(output['columns'])
                    self.assertTrue(all(len(r) == len(output['columns']) for r in output['rows']))
                else:
                    self.assertEqual(output['rows'], [])
                    self.assertTrue(output['reason'])

    def test_sales_and_profit(self):
        row = self.report('sales-orders')['rows'][0]
        self.assertEqual(row[2:7], ['200.00','20.00','5.00','10.00','195.00'])
        row = self.report('profit-orders')['rows'][0]
        self.assertEqual(row[2:5], ['180.00','60.00','120.00'])
        self.item.unit_cost_snapshot = None
        self.item.save()
        row = self.report('profit-orders')['rows'][0]
        self.assertIsNone(row[3])
        self.assertIsNone(row[4])
        self.assertEqual(row[6], 2)

    def test_no_parent_variant_double_count(self):
        ProductVariant.objects.create(product=self.product, title='50ml', sku='50', price=50, stock_level=3)
        rows = self.report('stock-current')['rows']
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][0], '50')
        self.assertEqual(rows[0][2], 3)

    def test_paid_and_refunded_not_confused(self):
        self.order.payment_status = 'Partially Refunded'
        self.order.save()
        self.assertEqual(self.report('sales-orders')['rows'], [])
        self.assertEqual(self.report('finance-refunds')['rows'][0][-1], '195.00')

    def test_shipping_event_window(self):
        Shipment.objects.create(order=self.order, shipped_at=self.now-timedelta(hours=2),
                                delivered_at=self.now-timedelta(hours=1))
        self.assertEqual(self.report('fulfillment-shipped')['rows'], [['2026-10-21', 1]])
        self.assertEqual(self.report('fulfillment-time')['rows'][0][2], 22)

    def test_date_validation_and_missing_report(self):
        for params in [{'start':'bad'}, {'start':'2027-01-01','end':'2026-01-01'},
                       {'start':'2020-01-01','end':'2026-10-21'}]:
            with self.assertRaises(ValidationError):
                report_data('sales-orders', params, self.now)
        with self.assertRaises(ValidationError):
            self.report('does-not-exist')

    def test_reports_permissions_csv_and_pagination(self):
        client = APIClient()
        self.assertIn(client.get('/api/shop/reports/').status_code, [401,403])
        user = CustomUser.objects.create_user(email='report-admin@example.test', password='TestPassword123!')
        client.force_authenticate(user)
        self.assertEqual(client.get('/api/shop/reports/').status_code,403)
        role, _ = Role.objects.get_or_create(name='Admin')
        UserRole.objects.create(user=user, role=role)
        self.assertEqual(client.get('/api/shop/reports/').status_code,200)
        # Use actual current dates for the endpoint bounds validation.
        from django.utils import timezone
        today = timezone.now().astimezone(TZ).date().isoformat()
        Order.objects.filter(pk=self.order.pk).update(created_at=timezone.now()-timedelta(seconds=1))
        query = {'start':today,'end':today,'export':'csv'}
        response = client.get('/api/shop/reports/sales-variants/', query)
        self.assertEqual(response.status_code,200)
        rows = list(csv.reader(io.StringIO(response.content.decode('utf-8-sig'))))
        self.assertTrue(any("'=GOLD" in row for row in rows))
        self.assertTrue(any('Perfume, "Gold"' in row for row in rows))
        response = client.get('/api/shop/reports/sales-orders/', {'start':today,'end':today,'page_size':1})
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data.get('data', response.data)['total'],1)
        response = client.get('/api/shop/reports/sales-orders/', {'start':today,'end':today,'page':0})
        self.assertEqual(response.status_code,400)
