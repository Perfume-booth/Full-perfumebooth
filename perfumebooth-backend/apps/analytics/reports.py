from collections import defaultdict
from datetime import timedelta
from math import ceil
from django.conf import settings
from .models import Event, OrderAttribution
from apps.shop.reporting import TZ

SUPPORTED = {'sessions-time', 'visitors-now', 'sessions-referrer', 'sessions-device', 'sessions-landing',
             'conversion', 'search-queries', 'search-clicks', 'search-conversion'} | {
    f'vitals-{metric}-{dimension}' for metric in ['lcp', 'inp', 'cls'] for dimension in ['time', 'page-type', 'url']}


def analytics_report(key, start, end):
    from apps.shop.report_catalog import limited
    notes = ['Consented, browser-reported observations only; not all visitors and not bot-proof. Visitor IDs represent browsers, not people.',
             'No browser event creates a purchase or changes order, payment, refund or inventory records.',
             f'Raw event retention: {settings.ANALYTICS_RETENTION_DAYS} days. Missing consent, blocked requests and expired history are not extrapolated.']
    base = Event.objects.filter(processed_at__isnull=False)
    first = base.order_by('received_at').values_list('received_at', flat=True).first()
    state = 'disabled' if not settings.FIRST_PARTY_ANALYTICS_ENABLED else 'ready' if first else 'awaiting_data'
    events = limited(base.filter(received_at__gte=start, received_at__lt=end).order_by('received_at', 'id')) if state == 'ready' else []
    sessions = defaultdict(list)
    for event in events:
        sessions[event.session_id].append(event)
    # Server-authoritative paid orders only. COD pending is not paid revenue.
    purchases = limited(OrderAttribution.objects.filter(session_id__in=sessions, order__created_at__gte=start,
        order__created_at__lt=end, order__payment_status='Paid').exclude(order__status__in=['Cancelled', 'Refunded']).select_related('order'))
    paid_sessions = {p.session_id for p in purchases}
    notes.append('Purchases mean Django Paid orders created in the selected window, attributed at checkout with a signed consent-session token. Uncollected COD and refunded orders are excluded; no revenue is inferred from thank-you pages.')
    columns, rows = [], []
    if key.startswith('vitals-'):
        _, metric, dimension = key.split('-', 2)
        latest = {}
        for event in events:
            if event.name == 'web_vital' and event.properties.get('metric') == metric.upper():
                identity = (event.session_id, event.properties['metric_id'])
                previous = latest.get(identity)
                if not previous or event.properties.get('metric_revision', 0) >= previous.properties.get('metric_revision', 0):
                    latest[identity] = event
        groups = defaultdict(list)
        for e in latest.values():
            label = e.received_at.astimezone(TZ).date().isoformat() if dimension == 'time' else e.path if dimension == 'url' else e.properties.get('page_type', 'unknown')
            groups[label].append(e.properties['value'])
        unit = 'score' if metric == 'cls' else 'ms'
        columns = ['Group', 'Observed samples', f'p75 {unit}']
        rows = [[key, len(values), sorted(values)[ceil(len(values)*.75)-1]] for key, values in sorted(groups.items())]
        notes.append('p75 uses nearest-rank over latest observed value per metric ID. Document-load URL, not each SPA route. Consent after page load can yield partial observations; no threshold certification is claimed.')
    elif key.startswith('search-'):
        searches = {(e.session_id, e.properties['search_id']): e for e in events if e.name == 'search'}
        clicks = {(e.session_id, e.properties.get('search_id')) for e in events if e.name == 'search_click'}
        groups = defaultdict(lambda: [0, 0, 0, set(), set()])
        for identity, e in searches.items():
            row = groups[e.properties['query']]
            row[0] += 1
            row[1] += int(e.properties['result_count'] == 0)
            row[2] += int(identity not in clicks)
            row[3].add(e.session_id)
            if any(p.session_id == e.session_id and p.order.created_at >= e.received_at for p in purchases):
                row[4].add(e.session_id)
        columns = ['Query', 'Suggestion searches', 'No-result searches', 'Searches without recorded clicks', 'Searching sessions', 'Sessions with later paid order', 'Observed session conversion %']
        rows = [[q, *v[:3], len(v[3]), len(v[4]), round(100*len(v[4])/len(v[3]), 2)] for q, v in sorted(groups.items())]
        notes.append('Search records are debounced suggestion requests, not submitted searches. Conversion is same-session association, not causal attribution. Only clicks linked to their search ID count. Active sessions may click or purchase later.')
    elif key == 'conversion':
        columns = ['Stage', 'Observed sessions']
        rows = [[name, len({e.session_id for e in events if e.name == name})] for name in ['page_view', 'view_item', 'add_to_cart', 'begin_checkout']]
        rows.append(['verified_paid_order', len(paid_sessions)])
        notes.append('Stage reach counts are independent, not a strictly sequential funnel. Paid-order stage comes from Django, not client telemetry.')
    elif key == 'visitors-now':
        recent = [e for e in events if e.received_at >= end-timedelta(minutes=5)]
        columns = ['Window end', 'Active observed browsers (last 5 minutes)']
        rows = [[end.isoformat(), len({e.visitor_id for e in recent})]] if state == 'ready' else []
        notes.append('Activity is based on received events, not continuous presence or a heartbeat.')
    else:
        groups = defaultdict(lambda: [set(), set()])
        for sid, observations in sessions.items():
            first_page = next((e for e in observations if e.name == 'page_view'), None)
            if not first_page:
                continue
            e = first_page
            label = e.received_at.astimezone(TZ).date().isoformat() if key == 'sessions-time' else e.path if key == 'sessions-landing' else e.properties.get('referrer' if key == 'sessions-referrer' else 'device') or 'Unknown / direct'
            groups[label][0].add(sid)
            groups[label][1].add(e.visitor_id)
        columns = ['Group', 'Observed sessions', 'Observed browsers']
        rows = [[k, len(v[0]), len(v[1])] for k, v in sorted(groups.items())]
        notes.append('Dimensions use the first observed page in the selected window, not necessarily the original landing page for a session crossing the window boundary. Session expiry is 30 minutes of inactivity, per browser tab.')
    if state != 'ready':
        rows = []
    return columns, rows, notes, state, first.isoformat() if first else None
