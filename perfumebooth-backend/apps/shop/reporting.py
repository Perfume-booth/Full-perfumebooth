"""Read-only INR order-cohort reporting. Dates use the business timezone."""
from datetime import datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db.models import Count, Sum, F, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.orders.models import Order, OrderItem
from .category_utils import clean_fragrance_category

TZ = ZoneInfo('Asia/Kolkata')
ZERO = Decimal('0')


def money(value):
    return f'₹{value:,.2f}'


def build_report(timeframe='7d', now=None):
    now = (now or timezone.now()).astimezone(TZ)
    today = now.date()
    days = {'today': 1, '7d': 7, '30d': 30, '90d': 90}
    if timeframe == 'ytd':
        first = today.replace(month=1, day=1)
    elif timeframe in days:
        first = today - timedelta(days=days[timeframe] - 1)
    else:
        raise ValidationError({'timeframe': 'Use today, 7d, 30d, 90d or ytd.'})
    start = datetime.combine(first, time.min, tzinfo=TZ)
    base = Order.objects.filter(currency='INR')
    orders = base.filter(created_at__gte=start, created_at__lt=now)

    def paid(qs):
        return qs.filter(payment_status=Order.PaymentStatus.PAID).exclude(
            status__in=[Order.Status.CANCELLED, Order.Status.REFUNDED])

    def totals(qs):
        result = paid(qs).aggregate(revenue=Sum('total'), count=Count('id'))
        revenue = result['revenue'] or ZERO
        return revenue, result['count'], revenue / result['count'] if result['count'] else ZERO

    revenue, paid_count, aov = totals(orders)
    previous = base.filter(created_at__gte=start - (now - start), created_at__lt=start)
    prev_revenue, _, prev_aov = totals(previous)
    order_count = orders.count()

    def kpi(title, value, current, old):
        change = ((current - old) / old * 100) if old else None
        return {'title': title, 'value': value,
                'change': f'{change:+.1f}%' if change is not None else 'No prior baseline',
                'isPositive': change is None or change >= 0}

    counts = {row['day']: row['count'] for row in orders.annotate(
        day=TruncDate('created_at', tzinfo=TZ)).values('day').annotate(count=Count('id'))}
    daily = {row['day']: row['total'] for row in paid(orders).annotate(
        day=TruncDate('created_at', tzinfo=TZ)).values('day').annotate(total=Sum('total'))}
    trend = []
    for offset in range((today - first).days + 1):
        day = first + timedelta(days=offset)
        trend.append({'name': day.isoformat(), 'sales': float(daily.get(day, ZERO)),
                      'orders': counts.get(day, 0)})

    lines = OrderItem.objects.filter(order__in=paid(orders))
    line_total = ExpressionWrapper(F('unit_price') * F('quantity'),
                                   output_field=DecimalField(max_digits=20, decimal_places=2))
    ranking = lines.values('product_id', 'product_title', 'sku').annotate(
        units=Sum('quantity'), revenue=Sum(line_total)).order_by('-revenue', 'sku', 'product_title')[:5]
    products = [{'rank': i + 1, 'title': row['product_title'] or 'Unnamed/deleted product',
                 'sku': row['sku'], 'units': row['units'], 'revenue': money(row['revenue'])}
                for i, row in enumerate(ranking)]
    categories = lines.values('product__attributes__category').annotate(
        revenue=Sum(line_total)).order_by('-revenue')
    colors = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#06b6d4', '#e11d48', '#d97706']
    grouped_rev = {}
    for row in categories:
        c_name = clean_fragrance_category(row['product__attributes__category'] or '')
        grouped_rev[c_name] = grouped_rev.get(c_name, 0.0) + float(row['revenue'] or 0.0)
    category_data = [{'name': cat, 'value': val, 'color': colors[i % len(colors)]}
                     for i, (cat, val) in enumerate(sorted(grouped_rev.items(), key=lambda x: x[1], reverse=True))]
    methods = orders.values('payment_method').annotate(count=Count('id')).order_by('payment_method')
    refunded = orders.filter(payment_status=Order.PaymentStatus.REFUNDED).aggregate(
        total=Sum('total'))['total'] or ZERO
    partial_count = orders.filter(payment_status=Order.PaymentStatus.PARTIALLY_REFUNDED).count()
    return {
        'timeframe': timeframe, 'generatedAt': now.isoformat(), 'timezone': str(TZ),
        'periodStart': start.isoformat(), 'periodEnd': now.isoformat(),
        'kpis': [kpi('Fully paid sales', money(revenue), revenue, prev_revenue),
                 kpi('Orders placed', str(order_count), order_count, previous.count()),
                 kpi('Paid order AOV', money(aov), aov, prev_aov)],
        'salesTrend': trend, 'categoryData': category_data, 'topProducts': products,
        'paymentMethods': [{'method': row['payment_method'],
                            'percentage': f"{row['count'] / order_count * 100:.1f}%" if order_count else '0%',
                            'count': f"{row['count']} orders"} for row in methods],
        'liveVisitors': None, 'paidOrderCount': paid_count,
        'fullyRefundedOrderTotal': str(refunded), 'partialRefundOrderCount': partial_count,
        'notes': [
            'INR only. Orders are grouped by creation date in Asia/Kolkata, using current payment status. This is not a settlement or accounting ledger.',
            'Sales and AOV include only fully paid, non-cancelled, non-refunded orders. Uncollected COD orders are excluded.',
            'Product/category revenue is quantity × historical unit price before order-level discounts, shipping and tax; category uses the current catalog.',
            'Fully refunded order totals: ' + money(refunded) + '. Partial refund orders excluded from paid sales: ' + str(partial_count) + '. Exact partial refund amounts are not recorded.',
            'Visitors, conversion and attribution are not tracked. Comparisons use the preceding equal-duration period.'
        ]
    }
