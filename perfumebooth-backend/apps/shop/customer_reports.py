from bisect import bisect_left
from decimal import Decimal
from .reporting import TZ


def rfm_rows(people, active, end):
    metrics = {who: ((end.astimezone(TZ).date()-p[-1].created_at.astimezone(TZ).date()).days,
                     len(p), sum((o.total for o in p), Decimal('0'))) for who, p in people.items()}
    populations = [sorted(values[index] if index else -values[index] for values in metrics.values()) for index in range(3)]

    def score(value, values):
        # Midrank gives all ties the same score, including tiny/all-equal cohorts.
        from bisect import bisect_right
        rank = (bisect_left(values, value)+bisect_right(values, value))/2
        return min(5, int(rank/len(values)*5)+1)

    rows = []
    for who, (recency, frequency, monetary) in sorted(metrics.items()):
        if who not in active:
            continue
        r, f, m = [score(v, populations[i]) for i, v in enumerate((-recency, frequency, monetary))]
        segment = ('Champions' if min(r, f, m) >= 4 else 'Loyal' if f >= 4 and r >= 3 else
                   'At risk' if r <= 2 and f >= 3 else 'New' if frequency == 1 and r >= 4 else
                   'Dormant' if r <= 2 else 'Developing')
        rows.append([who, recency, frequency, monetary, r, f, m, f'{r}{f}{m}', segment])
    return rows
