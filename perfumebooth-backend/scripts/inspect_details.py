import csv
import sys
import os
from datetime import datetime

sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.authentication.models import CustomUser, CustomerAddress
from apps.orders.models import Order, OrderItem
from apps.shop.models import Product
import zoneinfo

TZ_IST = zoneinfo.ZoneInfo('Asia/Kolkata')

def inspect():
    # 1. Investigate the 2 missing orders
    missing_names = {'PB1002343', 'PB1002342'}
    with open('/app/data_exports/orders_export_1.csv', 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        missing_rows = [r for r in reader if r.get('Name') in missing_names]

    print("=== DETAILS OF 2 MISSING ORDERS IN DB ===")
    for name in sorted(missing_names, reverse=True):
        rows = [r for r in missing_rows if r.get('Name') == name]
        if not rows:
            print(f"Order {name} not found in CSV!")
            continue
        p = rows[0]
        print(f"\nOrder {name}:")
        print(f"  Email: {p.get('Email')}")
        print(f"  Phone: {p.get('Phone') or p.get('Billing Phone')}")
        print(f"  Created at: {p.get('Created at')}")
        print(f"  Financial Status: {p.get('Financial Status')}")
        print(f"  Fulfillment Status: {p.get('Fulfillment Status')}")
        print(f"  Subtotal: {p.get('Subtotal')}, Shipping: {p.get('Shipping')}, Total: {p.get('Total')}")
        print(f"  Shipping Address: {p.get('Shipping Name')}, {p.get('Shipping Address1')}, {p.get('Shipping City')}, {p.get('Shipping Zip')}")
        print(f"  Line items ({len(rows)}):")
        for r in rows:
            print(f"    - Title: {r.get('Lineitem name')}")
            print(f"      SKU: {r.get('Lineitem sku')}, Qty: {r.get('Lineitem quantity')}, Price: {r.get('Lineitem price')}")
            # Check if product exists in DB
            sku = r.get('Lineitem sku', '').strip()
            title = r.get('Lineitem name', '').strip()
            prod = Product.objects.filter(sku=sku).first() if sku else None
            if not prod and title:
                prod = Product.objects.filter(title__icontains=title[:30]).first()
            print(f"      Matched Product in DB: {prod.title if prod else 'NOT FOUND'}")

    # 2. Check the 32 missing customers in DB
    print("\n=== DETAILS OF MISSING CUSTOMERS IN DB ===")
    with open('/app/data_exports/customers_export.csv', 'r', encoding='utf-8', errors='ignore') as f:
        cust_reader = csv.DictReader(f)
        cust_rows = list(cust_reader)

    db_emails = {u.email.lower().strip() for u in CustomUser.objects.all() if u.email}
    missing_custs = [r for r in cust_rows if r.get('Email', '').strip().lower() and r.get('Email', '').strip().lower() not in db_emails]
    print(f"Total missing customer records: {len(missing_custs)}")
    for c in missing_custs[:10]:
        print(f"  - Email: {c.get('Email')}, Name: {c.get('First Name')} {c.get('Last Name')}, Phone: {c.get('Phone')}, Total Spent: {c.get('Total Spent')}, Orders: {c.get('Total Orders')}")

    # 3. Check Order Date and Time Precision (in IST)
    print("\n=== ORDER DATE & TIME CHECK (CONVERTED TO IST) ===")
    with open('/app/data_exports/orders_export_1.csv', 'r', encoding='utf-8', errors='ignore') as f:
        ord_reader = csv.DictReader(f)
        all_ord_rows = list(ord_reader)

    db_orders = {o.order_number: o for o in Order.objects.all()}
    exact_match = 0
    second_diff = 0
    minute_diff = 0
    large_diff = []

    seen = set()
    for r in all_ord_rows:
        name = r.get('Name', '').strip()
        if not name or name in seen:
            continue
        seen.add(name)
        order = db_orders.get(name)
        if not order:
            continue

        csv_created = r.get('Created at', '').strip() # "2026-10-13 10:18:43 +0530"
        if not csv_created:
            continue
        
        # Parse CSV date string
        # format: "%Y-%m-%d %H:%M:%S %z"
        csv_dt = datetime.strptime(csv_created, '%Y-%m-%d %H:%M:%S %z')
        db_dt = order.created_at.astimezone(TZ_IST)

        diff = abs((csv_dt - db_dt).total_seconds())
        if diff == 0:
            exact_match += 1
        elif diff <= 60:
            second_diff += 1
        elif diff <= 3600:
            minute_diff += 1
        else:
            large_diff.append((name, str(csv_dt), str(db_dt), diff))

    print(f"Exact second date & time matches: {exact_match} / {len(seen) - len(missing_names)}")
    print(f"Within 1 minute: {second_diff}")
    print(f"Within 1 hour: {minute_diff}")
    print(f"Large difference (> 1 hr): {len(large_diff)}")
    if large_diff:
        print("Sample large differences:")
        for ld in large_diff[:5]:
            print(f"  Order {ld[0]}: CSV={ld[1]}, DB={ld[2]}, Diff={ld[3]}s")

    # 4. Check Order-Customer Linking Discrepancies
    print("\n=== CHECK ORDER-CUSTOMER LINKING ===")
    mislinked = []
    unlinked = []
    for r in all_ord_rows:
        name = r.get('Name', '').strip()
        if not name or name in missing_names:
            continue
        order = db_orders.get(name)
        if not order:
            continue
        csv_email = r.get('Email', '').strip().lower()
        if not order.user_id:
            unlinked.append((name, csv_email))
        elif not order.user.email or order.user.email.lower() != csv_email:
            mislinked.append((name, csv_email, order.user.email))

    print(f"Orders with NO linked user: {len(unlinked)}")
    print(f"Orders where linked user email != order customer email: {len(mislinked)}")
    if mislinked:
        print("Sample mislinked orders:")
        for ml in mislinked[:5]:
            print(f"  Order {ml[0]}: Order Email={ml[1]}, Linked User={ml[2]}")

if __name__ == '__main__':
    inspect()
