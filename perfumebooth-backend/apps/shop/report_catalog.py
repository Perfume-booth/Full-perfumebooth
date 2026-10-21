"""Single-business reports. Unsupported sources are explicit, never simulated."""
from collections import defaultdict, Counter
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from itertools import combinations
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.orders.models import Order, Shipment
from apps.shop.models import Product, ProductVariant, Inventory
from apps.inventory.models import InventoryMovement
from .reporting import TZ

ZERO = Decimal('0')
MAX_RECORDS = 25000
CATALOG = []


def register(group, entries, reason=''):
    for key, title in entries:
        CATALOG.append({'id': key, 'title': title, 'group': group,
                        'status': 'needs_data_source' if reason else 'available', 'reason': reason})


register('Sales', [('sales-orders', 'Sales breakdown by order'), ('sales-time', 'Sales over time'),
    ('sales-customers', 'Sales by customer'), ('sales-coupons', 'Sales by discount code'),
    ('sales-products', 'Sales by product'), ('sales-variants', 'Sales by variant'),
    ('sales-brands', 'Sales by brand'), ('sales-types', 'New vs returning customer sales'),
    ('sales-weekdays', 'Weekly sales patterns'), ('sales-averages', 'Average order value and quantity')])
register('Customers', [('customers-rfm', 'RFM customer list'), ('customers-repeat', 'New vs returning / one-time customers'),
    ('customers-cohorts', 'Customer cohort repeat-purchase analysis'), ('customers-location', 'Purchasing customers by shipping location'),
    ('customers-time', 'New vs returning purchasing customers over time'), ('customers-registrations', 'New customer accounts over time')])
register('Finance', [('finance-orders', 'Order finance: discounts, shipping and taxes'),
    ('finance-payments', 'Payments by method and status'), ('finance-outstanding', 'Outstanding payments'),
    ('finance-refunds', 'Fully / partially refunded order status'), ('finance-summary', 'Finance summary'),
    ('profit-orders', 'Gross profit and cost coverage by order'), ('profit-products', 'Gross profit by product'),
    ('profit-variants', 'Gross profit by variant')])
register('Inventory', [('stock-current', 'Current stock and SKU value'), ('stock-low', 'Low / out-of-stock SKUs'),
    ('stock-adjustments', 'Inventory adjustments and movements'), ('stock-adjustment-counts', 'Inventory movement counts'),
    ('stock-abc', 'ABC product sales analysis'), ('stock-days', 'Days of inventory remaining'),
    ('stock-sold', 'Paid units sold daily by product')])
register('Orders & fulfillment', [('orders-time', 'Orders over time'), ('orders-status', 'Orders by status'),
    ('orders-pairs', 'Items bought together'), ('fulfillment-tracking', 'Orders and shipment tracking'),
    ('fulfillment-time', 'Order to shipment / delivery time'), ('fulfillment-shipped', 'Shipments over time'),
    ('fulfillment-delivered', 'Delivered shipments over time')])
register('Finance', [('settlements', 'Razorpay settlement reconciliation'), ('fees', 'Net payments after gateway fees')],
    'Requires settlement, fee and refund transaction records from the payment gateway; order totals are not payouts.')
register('Orders & fulfillment', [('returns-products', 'Returned products, quantities and reasons'), ('returns-time', 'Reversed quantities over time'),
    ('shipping-labels', 'Shipping label costs and usage')], 'Requires a return-item ledger or shipping-label purchase records. Shipment tracking alone is insufficient.')
register('Inventory', [('stock-month-end', 'Month-end stock snapshot and valuation'), ('stock-sell-through', 'Sell-through and percentage sold')],
    'Requires reliable opening balances, receipts and historical cost snapshots. Current stock cannot reconstruct these accurately.')
register('Acquisition & search', [(k, t) for k, t in [
    ('sessions-time', 'Sessions and visitors over time'), ('visitors-now', 'Visitors right now'),
    ('sessions-referrer', 'Sessions by referrer / social referrer'), ('sessions-device', 'Sessions by device'),
    ('sessions-location', 'Sessions by location'), ('sessions-landing', 'Sessions by landing page'),
    ('conversion', 'Checkout and purchase conversion funnel'), ('bounce', 'Bounce rate'),
    ('search-queries', 'Search queries and no-result searches'), ('search-clicks', 'Searches without clicks'),
    ('search-conversion', 'Search-to-purchase conversion')]],
    'Requires an analytics data connection or consent-aware first-party event collection. Existing GTM events are not stored in this reporting database.')
register('Marketing', [('campaigns', 'Campaign and channel performance / ROAS'), ('sales-referrer', 'Sales by referrer / social referrer')],
    'Requires order attribution and campaign spend imports; coupon usage is not attribution.')
register('Fraud', [('fraud-risk', 'High-risk orders and fraud cancellations'), ('fraud-chargebacks', 'Chargeback amount and rate')],
    'Requires verified gateway disputes and risk-decision records; payment failure is not evidence of fraud.')
register('Store performance', [(f'vitals-{metric}-{dimension}', f'{metric.upper()} by {dimension}')
    for metric in ['lcp', 'inp', 'cls'] for dimension in ['time', 'page-type', 'url']],
    'Requires real-user Web Vitals collection; lab measurements cannot substitute for historical visitor data.')


def bounds(params, now=None):
    now = (now or timezone.now()).astimezone(TZ)
    try:
        last = date.fromisoformat(params.get('end', now.date().isoformat()))
        first = date.fromisoformat(params.get('start', (last - timedelta(days=29)).isoformat()))
    except (ValueError, TypeError):
        raise ValidationError('Dates must use YYYY-MM-DD.')
    if first > last or (last - first).days > 365 or last > now.date():
        raise ValidationError('Choose an ordered date range of at most 366 days, ending no later than today.')
    return datetime.combine(first, time.min, TZ), min(datetime.combine(last + timedelta(days=1), time.min, TZ), now)


def limited(qs):
    if qs.count() > MAX_RECORDS:
        raise ValidationError('This report exceeds 25,000 source records. Narrow the date range; no partial totals are returned.')
    return list(qs)


def identity(order):
    if order.user_id:
        return 'account:' + str(order.user_id)
    email = order.customer_email.strip().lower()
    return 'guest:' + email if email else 'unidentified-order:' + str(order.pk)


def paid(order):
    return order.payment_status == 'Paid' and order.status not in ['Cancelled', 'Refunded']


def number(value):
    return str(value.quantize(Decimal('.01'))) if isinstance(value, Decimal) else value


def report_data(key, params, now=None):
    spec = next((r for r in CATALOG if r['id'] == key), None)
    if not spec:
        raise ValidationError('Unknown report.')
    start, end = bounds(params, now)
    result = {**spec, 'start': start.isoformat(), 'end': end.isoformat(), 'timezone': str(TZ),
              'currency': 'INR', 'columns': [], 'rows': [], 'notes': [], 'generatedAt': timezone.now().isoformat()}
    if spec['status'] != 'available':
        return result
    notes = result['notes']
    notes.append('INR only. Date windows use Asia/Kolkata. Order reports use creation date and current payment status, not settlement date.')
    orders = limited(Order.objects.filter(created_at__gte=start, created_at__lt=end, currency='INR')
                     .select_related('user').prefetch_related('items__product').order_by('created_at', 'id'))
    settled = [o for o in orders if paid(o)]
    if sum(len(o.items.all()) for o in orders) > MAX_RECORDS:
        raise ValidationError('Too many order lines. Narrow the date range.')
    notes.append('Paid sales exclude pending/uncollected COD, cancelled, fully refunded and partially refunded orders. They are not net settlement revenue.')

    def finish(columns, rows):
        result['columns'] = columns
        result['rows'] = [[number(v) for v in row] for row in rows]
        return result

    if key.startswith('sales-') or key in ['finance-orders', 'finance-summary']:
        if key in ['sales-products', 'sales-variants', 'sales-brands']:
            groups = defaultdict(lambda: [0, ZERO])
            for o in settled:
                for i in o.items.all():
                    label = ((str(i.product_id or i.product_title), i.product_title) if key == 'sales-products' else
                             (i.sku, i.variant_title or i.product_title) if key == 'sales-variants' else
                             (i.brand_snapshot or 'Unknown (no snapshot)', ''))
                    groups[label][0] += i.quantity
                    groups[label][1] += i.quantity * i.unit_price
            notes.append('Product/brand amounts use historical line prices before order discounts, tax and shipping. Legacy brands are unknown, not inferred from today’s catalog.')
            return finish(['ID / SKU / brand', 'Title', 'Units', 'Gross merchandise INR'],
                          [[*label, *v] for label, v in sorted(groups.items(), key=lambda pair: -pair[1][1])])
        first_orders = {}
        if key == 'sales-types':
            history = limited(Order.objects.filter(created_at__lt=end, currency='INR', payment_status='Paid')
                              .exclude(status__in=['Cancelled', 'Refunded']).order_by('created_at', 'id'))
            for o in history:
                first_orders.setdefault(identity(o), o.pk)
            notes.append('New/returning uses first qualifying paid order. Accounts and guest emails are separate identities; unidentified guests are not merged.')
        groups = defaultdict(lambda: [0, ZERO, ZERO, ZERO, ZERO, ZERO, 0])
        for o in settled:
            day = o.created_at.astimezone(TZ).date().isoformat()
            label = {'sales-orders': o.order_number, 'finance-orders': o.order_number,
                     'sales-time': day, 'sales-averages': day, 'sales-weekdays': o.created_at.astimezone(TZ).strftime('%A'),
                     'sales-customers': identity(o) + ' | ' + (o.user.full_name if o.user else str(o.shipping_address.get('name') or o.shipping_address.get('first_name') or 'Guest')), 'sales-coupons': o.coupon_code or '(No coupon)',
                     'sales-types': 'New' if first_orders.get(identity(o)) == o.pk else 'Returning',
                     'finance-summary': 'All qualifying paid orders'}.get(key)
            v = groups[label]
            v[0] += 1
            for n, amount in enumerate([o.subtotal, o.discount_amount, o.shipping_amount, o.tax_amount, o.total], 1):
                v[n] += amount
            v[6] += sum(i.quantity for i in o.items.all())
        if key == 'sales-averages':
            return finish(['Date', 'Paid orders', 'Paid AOV INR', 'Average units per order'],
                          [[label, v[0], v[5] / v[0], round(v[6] / v[0], 2)] for label, v in sorted(groups.items())])
        notes.append('Merchandise after discount = subtotal minus order discount, before any refunds. Gross subtotal is the stored checkout subtotal, not original compare-at prices.')
        return finish(['Group', 'Paid orders', 'Gross subtotal INR', 'Discount INR', 'Shipping INR', 'Tax INR', 'Paid total INR', 'Units', 'Merchandise after discount INR'],
                      [[label, *v, v[1] - v[2]] for label, v in sorted(groups.items())])

    if key.startswith('profit-'):
        groups = defaultdict(lambda: [0, ZERO, ZERO, 0])
        for o in settled:
            items = list(o.items.all())
            gross = sum((i.quantity * i.unit_price for i in items), ZERO)
            for i in items:
                label = (o.order_number if key == 'profit-orders' else
                         str(i.product_id or i.product_title) + ' ' + i.product_title if key == 'profit-products' else i.sku)
                v = groups[label]
                v[0] += i.quantity
                v[1] += i.quantity * i.unit_price - (o.discount_amount * i.quantity * i.unit_price / gross if gross else ZERO)
                if i.unit_cost_snapshot is None:
                    v[3] += i.quantity
                else:
                    v[2] += i.quantity * i.unit_cost_snapshot
        notes.append('Profit excludes tax, shipping income, gateway fees and overhead. Order discounts are allocated proportionally across merchandise lines. Unknown historical costs make COGS/profit/margin unavailable for the entire group.')
        return finish(['Order / product / SKU', 'Units', 'Merchandise after discount INR', 'COGS INR', 'Gross profit INR', 'Margin %', 'Units missing cost'],
                      [[label, v[0], v[1], None if v[3] else v[2], None if v[3] else v[1]-v[2],
                        None if v[3] or not v[1] else round((v[1]-v[2])/v[1]*100, 2), v[3]] for label, v in sorted(groups.items())])

    if key == 'finance-payments':
        groups = defaultdict(lambda: [0, ZERO])
        for o in orders:
            groups[(o.payment_method, o.payment_status)][0] += 1
            groups[(o.payment_method, o.payment_status)][1] += o.total
        notes.append('Amounts are order face values by status, not net payment transactions or gateway settlements.')
        return finish(['Method', 'Payment status', 'Orders', 'Order face value INR'], [[*k, *v] for k, v in sorted(groups.items())])
    if key in ['finance-outstanding', 'finance-refunds']:
        statuses = ['Pending', 'Authorized', 'Failed'] if key == 'finance-outstanding' else ['Refunded', 'Partially Refunded']
        notes.append('Refund rows show order face value only; exact refund amount/time is not available. Failed payments are outstanding attempts, not accounts receivable.')
        return finish(['Order', 'Date', 'Method', 'Payment status', 'Order status', 'Order face value INR'],
                      [[o.order_number, o.created_at.astimezone(TZ).date().isoformat(), o.payment_method, o.payment_status, o.status, o.total]
                       for o in orders if o.payment_status in statuses and (key == 'finance-refunds' or o.status != 'Cancelled')])

    if key.startswith('customers-'):
        if key == 'customers-registrations':
            from apps.authentication.models import CustomUser
            from django.db.models.functions import TruncDate
            from django.db.models import Count
            rows = CustomUser.objects.filter(is_staff=False, roles__isnull=True, date_joined__gte=start, date_joined__lt=end).annotate(
                day=TruncDate('date_joined', tzinfo=TZ)).values('day').annotate(count=Count('id')).order_by('day')
            notes.append('Account registration dates only. Guest purchasers are not registered accounts; staff/role-bearing accounts are excluded.')
            return finish(['Registration date', 'New accounts'], [[r['day'].isoformat(), r['count']] for r in rows])
        history = limited(Order.objects.filter(created_at__lt=end, currency='INR', payment_status='Paid')
                          .exclude(status__in=['Cancelled', 'Refunded']).order_by('created_at', 'id'))
        people = defaultdict(list)
        for o in history:
            people[identity(o)].append(o)
        notes.append('Purchasers only. Identity is account ID, otherwise normalized guest email; unidentified guests stay separate. RFM reports raw recency/frequency/monetary measures, not predictive scores.')
        active = {identity(o) for o in settled}
        if key == 'customers-time':
            daily = defaultdict(lambda: [set(), set()])
            for o in settled:
                who = identity(o)
                first_day = people[who][0].created_at.astimezone(TZ).date()
                day = o.created_at.astimezone(TZ).date()
                daily[day][0 if first_day == day else 1].add(who)
            notes.append('New means first qualifying paid purchase on that date; each identity is counted once per date. Repeat rate is returning purchasers / all purchasers on that date.')
            return finish(['Date', 'New purchasers', 'Returning purchasers', 'Returning purchaser rate %'],
                          [[day.isoformat(), len(v[0]), len(v[1]), round(len(v[1])/(len(v[0])+len(v[1]))*100, 2)] for day, v in sorted(daily.items())])
        if key == 'customers-location':
            places = defaultdict(set)
            for o in settled:
                a = o.shipping_address
                places[(a.get('country') or 'Unknown', a.get('state') or 'Unknown', a.get('city') or 'Unknown')].add(identity(o))
            return finish(['Shipping country', 'State', 'City', 'Unique purchasing identities'], [[*k, len(v)] for k, v in sorted(places.items())])
        if key == 'customers-cohorts':
            cohorts = defaultdict(set)
            activity = defaultdict(set)
            for who, purchases in people.items():
                first = purchases[0].created_at.astimezone(TZ)
                cohort = first.strftime('%Y-%m')
                for o in purchases:
                    if start <= o.created_at < end:
                        month = o.created_at.astimezone(TZ)
                        age = (month.year-first.year)*12 + month.month-first.month
                        activity[(cohort, age)].add(who)
                cohorts[cohort].add(who)
            return finish(['First paid month', 'Month since first purchase', 'Cohort size', 'Active purchasers in selected range', 'Repeat activity %'],
                          [[c, age, len(cohorts[c]), len(v), round(len(v)/len(cohorts[c])*100, 2)] for (c, age), v in sorted(activity.items())])
        return finish(['Customer identity', 'First paid order', 'Last paid order', 'Recency days', 'Lifetime paid orders', 'Lifetime paid total INR', 'Type'],
                      [[who, p[0].created_at.astimezone(TZ).date().isoformat(), p[-1].created_at.astimezone(TZ).date().isoformat(),
                        (end.date()-p[-1].created_at.astimezone(TZ).date()).days, len(p), sum((o.total for o in p), ZERO),
                        'One-time' if len(p)==1 else 'Returning'] for who, p in people.items() if who in active])

    if key in ['orders-time', 'orders-status']:
        groups = Counter(o.created_at.astimezone(TZ).date().isoformat() if key == 'orders-time' else o.status for o in orders)
        return finish(['Date' if key == 'orders-time' else 'Status', 'Orders'], sorted(groups.items()))
    if key == 'orders-pairs':
        pairs = Counter()
        for o in settled:
            labels = sorted({(str(i.product_id or i.sku), i.product_title) for i in o.items.all()})
            if len(labels) > 100:
                raise ValidationError('An order contains too many distinct products for synchronous pair analysis.')
            pairs.update(combinations(labels, 2))
        return finish(['Product A', 'Product B', 'Orders bought together'], [[a[1], b[1], n] for (a, b), n in pairs.most_common()])

    if key.startswith('fulfillment-'):
        date_field = 'delivered_at' if key == 'fulfillment-delivered' else 'shipped_at' if key == 'fulfillment-shipped' else 'order__created_at'
        shipments = limited(Shipment.objects.filter(**{date_field+'__gte':start, date_field+'__lt':end}, order__currency='INR').select_related('order').order_by('created_at', 'id'))
        notes.append('Fulfillment reports count shipment records, not unique orders; split shipments remain separate. Missing timestamps are unknown.')
        if key in ['fulfillment-shipped', 'fulfillment-delivered']:
            groups = Counter(getattr(s, date_field).astimezone(TZ).date().isoformat() for s in shipments)
            return finish(['Event date', 'Shipment count'], sorted(groups.items()))
        if key == 'fulfillment-time':
            return finish(['Order', 'Shipment', 'Hours to shipment', 'Hours to delivery'],
                          [[s.order.order_number, str(s.pk), round((s.shipped_at-s.order.created_at).total_seconds()/3600, 2) if s.shipped_at else None,
                            round((s.delivered_at-s.order.created_at).total_seconds()/3600, 2) if s.delivered_at else None] for s in shipments])
        shipped_orders = {s.order_id for s in shipments}
        return finish(['Order', 'Shipment status', 'Courier', 'AWB', 'Tracking URL'],
                      [[s.order.order_number, s.status, s.courier_name, s.awb_code, s.tracking_url] for s in shipments] +
                      [[o.order_number, 'No shipment', '', '', ''] for o in orders if o.pk not in shipped_orders])

    if key in ['stock-adjustments', 'stock-adjustment-counts']:
        moves = limited(InventoryMovement.objects.filter(created_at__gte=start, created_at__lt=end)
                        .select_related('product', 'variant').order_by('created_at', 'id'))
        if key == 'stock-adjustment-counts':
            groups = Counter(m.movement_type for m in moves)
            return finish(['Movement type', 'Count'], sorted(groups.items()))
        return finish(['Date', 'SKU', 'Type', 'Stock delta', 'Reserved delta', 'Stock after', 'Reason'],
                      [[m.created_at.astimezone(TZ).isoformat(), m.variant.sku if m.variant else m.product.sku if m.product else 'Deleted',
                        m.movement_type, m.stock_delta, m.reserved_delta, m.stock_after, m.reason] for m in moves])
    if key in ['stock-abc', 'stock-sold']:
        groups = defaultdict(lambda: [0, ZERO])
        for o in settled:
            for i in o.items.all():
                label = (o.created_at.astimezone(TZ).date().isoformat() if key == 'stock-sold' else '', str(i.product_id or i.sku), i.product_title)
                groups[label][0] += i.quantity
                groups[label][1] += i.quantity*i.unit_price
        if key == 'stock-sold':
            return finish(['Date', 'Product ID', 'Product', 'Paid units', 'Gross merchandise INR'], [[*k, *v] for k, v in sorted(groups.items())])
        total = sum((v[1] for v in groups.values()), ZERO)
        cumulative = ZERO
        rows = []
        for (_, pid, title), (units, value) in sorted(groups.items(), key=lambda pair: -pair[1][1]):
            grade = 'A' if total and cumulative/total < Decimal('.8') else 'B' if total and cumulative/total < Decimal('.95') else 'C'
            cumulative += value
            rows.append([pid, title, units, value, grade, round(cumulative/total*100, 2) if total else 0])
        notes.append('ABC ranks gross merchandise sales: A contributes the first 80%, B the next 15%, C the remainder; boundaries include the crossing product.')
        return finish(['Product ID', 'Product', 'Paid units', 'Gross merchandise INR', 'ABC', 'Cumulative %'], rows)
    if key in ['stock-current', 'stock-low', 'stock-days']:
        variants = limited(ProductVariant.objects.select_related('product').order_by('sku'))
        simple = limited(Inventory.objects.filter(product__variants__isnull=True).select_related('product').order_by('product__sku'))
        sold = Counter()
        for o in settled:
            for i in o.items.all():
                sold[(i.product_id, i.variant_id)] += i.quantity
        rows = []
        for obj in [*variants, *simple]:
            variant = isinstance(obj, ProductVariant)
            p = obj.product
            available = max(0, obj.stock_level-obj.reserved_stock)
            if key == 'stock-low' and available > 5:
                continue
            cost = obj.cost_price if variant else p.cost_per_item
            units = sold[(p.pk, obj.pk if variant else None)]
            days = max((end-start).total_seconds()/86400, 1)
            rows.append([obj.sku if variant else p.sku, p.title, obj.stock_level, obj.reserved_stock, available,
                         cost, cost*obj.stock_level if cost is not None else None, units,
                         round(available/(units/days), 1) if units else None])
        notes.append('Stock is current, regardless of selected dates. Parent stock is excluded when variants exist. Low stock threshold is 5 available units. Days remaining uses paid sales in the selected period; no sales means unknown, not zero.')
        return finish(['SKU', 'Product', 'On hand', 'Reserved', 'Available', 'Current unit cost INR', 'Current stock value INR', 'Paid units in range', 'Estimated days remaining'], rows)
    raise ValidationError('Report has no implementation.')
