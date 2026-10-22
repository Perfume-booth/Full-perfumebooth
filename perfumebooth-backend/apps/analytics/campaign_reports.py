"""Explicit same-session UTM attribution, never modeled cross-device attribution."""
from collections import defaultdict
from decimal import Decimal
from django.conf import settings
from .models import Event, OrderAttribution, ProviderSnapshot
from .providers import ACCOUNT


def campaign_report(start, end):
    from apps.shop.report_catalog import limited, TZ
    source_map = {'google': 'google_ads', 'meta': 'meta_ads', 'facebook': 'meta_ads', 'instagram': 'meta_ads'}
    pages = limited(Event.objects.filter(name='page_view', processed_at__isnull=False,
        received_at__gte=start, received_at__lt=end).order_by('received_at', 'id'))
    first_touch = {}
    for event in pages:
        first_touch.setdefault(event.session_id, event)
    labels = {}
    for sid, event in first_touch.items():
        p = event.properties
        if p.get('utm_source') in source_map and p.get('utm_campaign'):
            labels[sid] = (source_map[p['utm_source']], p['utm_campaign'])
    groups = defaultdict(lambda: {'sessions': set(), 'orders': 0, 'revenue': Decimal('0'), 'unknown': False})
    for sid, label in labels.items():
        groups[label]['sessions'].add(sid)
    orders = limited(OrderAttribution.objects.filter(session_id__in=labels, order__created_at__gte=start,
        order__created_at__lt=end, order__currency='INR').select_related('order'))
    for attributed in orders:
        order = attributed.order
        if order.created_at < first_touch[attributed.session_id].received_at:
            continue
        row = groups[labels[attributed.session_id]]
        if order.payment_status in ['Refunded', 'Partially Refunded']:
            row['unknown'] = True  # Item-level refund allocations are not implemented yet.
        elif order.payment_status == 'Paid' and order.status not in ['Cancelled', 'Refunded']:
            row['orders'] += 1
            row['revenue'] += order.subtotal-order.discount_amount
    spend, coverage = {}, defaultdict(set)
    snapshots = limited(ProviderSnapshot.objects.filter(provider__in=['google_ads', 'meta_ads'],
        day__gte=start.date(), day__lte=end.date()).order_by('day'))
    for snapshot in snapshots:
        if snapshot.account != settings.ANALYTICS_INTEGRATIONS.get(ACCOUNT[snapshot.provider], ''):
            continue
        coverage[snapshot.provider].add(snapshot.day)
        for entry in snapshot.rows:
            label = (snapshot.provider, str(entry[0]))
            row = spend.setdefault(label, {'amount': Decimal('0'), 'compatible': True})
            row['amount'] += Decimal(entry[3]) if entry[2] == 'INR' else Decimal('0')
            row['compatible'] &= entry[2] == 'INR' and entry[6] == 'Asia/Kolkata'
    rows = []
    for label in sorted(set(groups) | set(spend)):
        observed = groups.get(label)
        cost = spend.get(label)
        revenue = observed['revenue'] if observed and not observed['unknown'] else None
        complete = len(coverage[label[0]]) == (end.date()-start.date()).days+1
        compatible = cost and cost['compatible'] and complete
        amount = cost['amount'] if cost and cost['compatible'] else None
        ratio = revenue/amount if revenue is not None and compatible and amount else None
        rows.append([*label, len(observed['sessions']) if observed else None, observed['orders'] if observed else None,
                     str(revenue) if revenue is not None else None, str(amount) if amount is not None else None,
                     str(round(ratio, 4)) if ratio is not None else None,
                     'Comparable spend dates complete' if compatible else 'Spend history/currency/timezone incomplete'])
    notes = [
        'Observed consent-attributed ROAS only, NOT total campaign ROAS. First observed page in each session/window supplies attribution; no cross-device or modeled attribution.',
        'Use utm_source=google or meta/facebook/instagram and utm_campaign equal to the exact advertising campaign ID. Names and click IDs are not guessed or auto-matched.',
        'Revenue is Django paid-order subtotal minus order discounts, excluding tax/shipping. Uncollected COD is excluded. Any attributed refunded order makes revenue/ROAS unknown until item-level refund allocation exists.',
        'ROAS requires INR, Asia/Kolkata provider timezone, positive spend, and a successful snapshot for EVERY selected date. Select completed historical dates; current-day spend is not synced.',
        'Missing attribution is unknown, not zero sales. Consent and retention limit coverage. Unknown markers must not be treated as zero.',
    ]
    return ['Provider', 'Campaign ID', 'Observed sessions', 'Attributed paid orders', 'Observed merchandise revenue INR',
            'Fetched spend INR', 'Observed ROAS', 'Coverage'], rows, notes, 'ready' if rows else 'awaiting_data', None
