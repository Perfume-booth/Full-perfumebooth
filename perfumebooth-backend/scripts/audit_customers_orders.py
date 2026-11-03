import csv
import sys
import os

sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.authentication.models import CustomUser, CustomerAddress
from apps.orders.models import Order, OrderItem
from django.utils import timezone
from datetime import datetime

def run_audit():
    print("=" * 60)
    print("STARTING CUSTOMERS & ORDERS AUDIT")
    print("=" * 60)

    # 1. Audit Customers
    cust_file = '/app/data_exports/customers_export.csv'
    with open(cust_file, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        cust_rows = list(reader)

    print(f"\n1. CUSTOMERS AUDIT ({cust_file})")
    print(f"Total rows in CSV: {len(cust_rows)}")
    print(f"Columns: {list(cust_rows[0].keys()) if cust_rows else []}")

    db_users_count = CustomUser.objects.count()
    db_staff_count = CustomUser.objects.filter(is_staff=True).count()
    print(f"Total CustomUsers in DB: {db_users_count} (Staff: {db_staff_count}, Customers: {db_users_count - db_staff_count})")

    # Build DB user map by email (normalized lower)
    db_users = {u.email.lower().strip(): u for u in CustomUser.objects.all() if u.email}
    
    csv_emails = set()
    matched_users = 0
    missing_in_db = []
    name_mismatches = 0
    phone_mismatches = 0
    address_missing = 0
    
    for row in cust_rows:
        raw_email = row.get('Email', '').strip().lower()
        if not raw_email:
            continue
        csv_emails.add(raw_email)
        
        user = db_users.get(raw_email)
        if user:
            matched_users += 1
            csv_fn = row.get('First Name', '').strip()
            csv_ln = row.get('Last Name', '').strip()
            if (csv_fn and user.first_name != csv_fn) or (csv_ln and user.last_name != csv_ln):
                name_mismatches += 1
                
            csv_phone = (row.get('Phone', '') or row.get('Default Address Phone', '')).strip().replace("'", "").replace(" ", "")
            db_phone = (user.phone or '').replace(" ", "")
            if csv_phone and db_phone != csv_phone:
                phone_mismatches += 1
        else:
            missing_in_db.append(row)

    print(f"Unique non-empty emails in CSV: {len(csv_emails)}")
    print(f"Matched users in DB: {matched_users}")
    print(f"Missing customers in DB: {len(missing_in_db)}")
    print(f"Name discrepancies: {name_mismatches}")
    print(f"Phone discrepancies: {phone_mismatches}")

    if missing_in_db:
        print(f"Sample missing customer in DB: {missing_in_db[0].get('Email')} ({missing_in_db[0].get('First Name')} {missing_in_db[0].get('Last Name')})")

    # Check users in DB not in CSV
    db_only = [email for email in db_users if email not in csv_emails]
    print(f"Users in DB but not in CSV: {len(db_only)} (includes staff accounts: {[u.email for u in CustomUser.objects.filter(is_staff=True)]})")

    # 2. Audit Orders
    ord_file = '/app/data_exports/orders_export_1.csv'
    with open(ord_file, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        ord_rows = list(reader)

    print(f"\n2. ORDERS AUDIT ({ord_file})")
    print(f"Total row lines in CSV: {len(ord_rows)}")

    # Group CSV lines by order name
    orders_by_name = {}
    for r in ord_rows:
        name = r.get('Name', '').strip()
        if not name:
            continue
        if name not in orders_by_name:
            orders_by_name[name] = []
        orders_by_name[name].append(r)

    print(f"Unique order numbers in CSV: {len(orders_by_name)}")
    db_orders_count = Order.objects.count()
    print(f"Total Orders in DB: {db_orders_count}")

    # Build DB orders map by order_number
    db_orders = {o.order_number: o for o in Order.objects.all()}
    
    # Also index by stripping '#' or 'PB'
    db_orders_normalized = {}
    for o in Order.objects.all():
        db_orders_normalized[o.order_number] = o
        clean_num = o.order_number.replace('#', '').replace('PB', '').strip()
        db_orders_normalized[clean_num] = o

    matched_orders = 0
    missing_orders = []
    date_mismatches = 0
    total_mismatches = 0
    status_mismatches = 0
    item_count_mismatches = 0
    unlinked_customers = 0

    sample_comparisons = []

    for name, lines in orders_by_name.items():
        primary = lines[0]
        # Try finding in DB
        order = db_orders.get(name) or db_orders.get(name.replace('#', '')) or db_orders.get('PB' + name.replace('#', '').replace('PB', ''))
        if not order:
            clean = name.replace('#', '').replace('PB', '').strip()
            order = db_orders_normalized.get(clean)

        if not order:
            missing_orders.append((name, primary.get('Email'), primary.get('Total'), primary.get('Created at')))
            continue

        matched_orders += 1
        
        # Check Customer Link
        if not order.user_id:
            unlinked_customers += 1

        # Check Total
        csv_total = primary.get('Total', '').strip()
        if csv_total:
            try:
                c_tot = float(csv_total)
                d_tot = float(order.total)
                if abs(c_tot - d_tot) > 0.05:
                    total_mismatches += 1
            except ValueError:
                pass

        # Check Created At Date and Time (converted to Asia/Kolkata IST)
        csv_created = primary.get('Created at', '').strip() # e.g. "2026-10-28 23:47:02 +0530"
        if csv_created:
            try:
                csv_dt = datetime.strptime(csv_created, "%Y-%m-%d %H:%M:%S %z")
                import zoneinfo
                tz_ist = zoneinfo.ZoneInfo('Asia/Kolkata')
                db_dt = order.created_at.astimezone(tz_ist)
                diff = abs((csv_dt - db_dt).total_seconds())
                if diff > 1: # more than 1 second difference
                    date_mismatches += 1
            except Exception:
                pass

        # Check Line Items Count
        db_items_count = order.items.count()
        csv_items_count = len(lines)
        if db_items_count != csv_items_count:
            item_count_mismatches += 1

        if len(sample_comparisons) < 3:
            sample_comparisons.append({
                'name': name,
                'db_order_number': order.order_number,
                'csv_email': primary.get('Email'),
                'db_email': order.customer_email,
                'user_linked': order.user.email if order.user else 'NONE',
                'csv_created': csv_created,
                'db_created': str(order.created_at),
                'csv_total': csv_total,
                'db_total': str(order.total),
                'csv_status': f"Fin: {primary.get('Financial Status')}, Ful: {primary.get('Fulfillment Status')}",
                'db_status': f"Pay: {order.payment_status}, Stat: {order.status}",
                'csv_items': csv_items_count,
                'db_items': db_items_count
            })

    print(f"\nORDER MATCH RESULTS:")
    print(f"Matched Orders in DB: {matched_orders} / {len(orders_by_name)}")
    print(f"Missing Orders in DB: {len(missing_orders)}")
    print(f"Orders with unlinked user (guest/null user): {unlinked_customers}")
    print(f"Date discrepancies (different day): {date_mismatches}")
    print(f"Total amount discrepancies: {total_mismatches}")
    print(f"Line items count discrepancies: {item_count_mismatches}")

    if missing_orders:
        print("\nFirst 5 Missing Orders in DB:")
        for m in missing_orders[:5]:
            print(f"  Order {m[0]}: Email={m[1]}, Total={m[2]}, Date={m[3]}")

    print("\nSAMPLE ORDER COMPARISONS:")
    for sc in sample_comparisons:
        print(f"--- Order {sc['name']} ---")
        for k, v in sc.items():
            print(f"  {k}: {v}")

    # Check orders in DB not in CSV
    csv_order_names = set(orders_by_name.keys())
    db_only_orders = []
    for o in Order.objects.all():
        num = o.order_number
        if num not in csv_order_names and num.replace('#', '') not in csv_order_names:
            db_only_orders.append((o.order_number, o.customer_email, o.total, str(o.created_at)))
    print(f"\nOrders in DB but NOT in CSV: {len(db_only_orders)}")
    if db_only_orders:
        print(f"Sample DB-only orders:")
        for d in db_only_orders[:5]:
            print(f"  {d[0]}: Email={d[1]}, Total={d[2]}, Date={d[3]}")

if __name__ == '__main__':
    run_audit()
