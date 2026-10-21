from datetime import datetime, timedelta
from decimal import Decimal
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.orders.models import Order, OrderItem
from apps.shop.models import Product
from apps.shop.reporting import build_report, TZ


class ReportingTests(TestCase):
    now = datetime(2026, 10, 21, 12, tzinfo=TZ)

    def order(self, number, payment='Paid', status='Delivered', total='100', date=None, currency='INR'):
        order = Order.objects.create(order_number=number, subtotal=total, total=total,
                                     payment_status=payment, status=status, currency=currency)
        Order.objects.filter(pk=order.pk).update(created_at=date or self.now - timedelta(hours=1))
        return order

    def test_empty_report_has_zero_not_samples(self):
        report = build_report(now=self.now)
        self.assertEqual(report['kpis'][0]['value'], '₹0.00')
        self.assertEqual(report['kpis'][1]['value'], '0')
        self.assertEqual(report['topProducts'], [])
        self.assertIsNone(report['liveVisitors'])

    def test_payment_status_and_refunds(self):
        self.order('paid', total='200')
        self.order('pending', payment='Pending')
        self.order('cancelled', status='Cancelled')
        self.order('refunded', payment='Refunded', status='Refunded')
        self.order('partial', payment='Partially Refunded')
        self.order('other-currency', currency='USD')
        report = build_report(now=self.now)
        self.assertEqual(report['kpis'][0]['value'], '₹200.00')
        self.assertEqual(report['kpis'][2]['value'], '₹200.00')
        self.assertEqual(report['kpis'][1]['value'], '5')
        self.assertEqual(sum(d['sales'] for d in report['salesTrend']), 200)
        self.assertEqual(report['partialRefundOrderCount'], 1)
        self.assertEqual(Decimal(report['fullyRefundedOrderTotal']), Decimal('100'))

    def test_ranking_uses_order_items_not_stock(self):
        product = Product.objects.create(title='Current name', slug='p', sku='p', price=999,
                                         attributes={'category': 'Attar'})
        order = self.order('sale')
        OrderItem.objects.create(order=order, product=product, product_title='Historic name',
                                 sku='historic', quantity=3, unit_price=20)
        report = build_report(now=self.now)
        self.assertEqual(report['topProducts'][0]['units'], 3)
        self.assertEqual(report['topProducts'][0]['revenue'], '₹60.00')
        self.assertEqual(report['categoryData'][0]['value'], 60)

    def test_date_ranges_and_timezone(self):
        for timeframe, length in [('today', 1), ('7d', 7), ('30d', 30), ('90d', 90), ('ytd', 294)]:
            self.assertEqual(len(build_report(timeframe, self.now)['salesTrend']), length)
        self.order('midnight', date=self.now.replace(hour=0, minute=0))
        self.order('yesterday', date=self.now.replace(hour=0, minute=0) - timedelta(seconds=1))
        self.order('future', date=self.now + timedelta(days=1))
        self.assertEqual(build_report('today', self.now)['kpis'][1]['value'], '1')
        with self.assertRaises(ValidationError):
            build_report('invalid', self.now)

    def test_equal_duration_comparison(self):
        self.order('current', total='200')
        self.order('previous', total='100', date=self.now - timedelta(days=8))
        self.assertEqual(build_report(now=self.now)['kpis'][0]['change'], '+100.0%')
