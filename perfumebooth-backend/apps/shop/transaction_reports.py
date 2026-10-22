from collections import defaultdict
from decimal import Decimal
from apps.orders.models import PaymentTransaction
from .reporting import TZ


def money_report(key, start, end):
    from .report_catalog import limited
    entries = limited(PaymentTransaction.objects.filter(currency='INR', occurred_at__gte=start,
                      occurred_at__lt=end).select_related('order').order_by('occurred_at', 'id'))
    notes = [
        'Verified ledger only; legacy payments and COD collections without ledger entries are NOT included. Empty rows do not prove no money was collected.',
        'INR. Window uses movement time, not order creation. Captures currently use first verified observation time; refunds use provider event time when supplied, otherwise receipt time.',
        'Net collections = captures minus processed refunds. This is not net sales or settlement payout; fees, tax allocation and settlement adjustments are not deducted.',
    ]
    if key == 'finance-refunds':
        return (['Order', 'Refund reference', 'Payment reference', 'Gateway', 'Method', 'Refund amount INR', 'Occurred at', 'Time basis'],
                [[e.order.order_number, e.reference, e.payment_id, e.gateway, e.method or 'Unknown', e.amount,
                  e.occurred_at.astimezone(TZ).isoformat(), e.time_basis] for e in entries if e.kind == 'refund'], notes)
    groups = defaultdict(lambda: [0, Decimal('0'), 0, Decimal('0')])
    for e in entries:
        row = groups[(e.gateway, e.method or 'Unknown')]
        offset = 0 if e.kind == 'capture' else 2
        row[offset] += 1
        row[offset+1] += e.amount
    return (['Gateway', 'Method', 'Capture count', 'Captured INR', 'Refund count', 'Refunded INR', 'Net collections INR'],
            [[*k, *v, v[1]-v[3]] for k, v in sorted(groups.items())], notes)
