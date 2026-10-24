import csv
import os
import sys
from datetime import datetime

sys.path.insert(0, '/app')
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.db import connection
from psycopg2.extras import execute_batch

CSV_PATH = '/app/scratch/orders_export_1.csv'
if not os.path.exists(CSV_PATH):
    # fallback to local relative path if running on host
    CSV_PATH = os.path.join(os.path.dirname(__file__), 'orders_export_1.csv')

print(f"[*] Reading orders from: {CSV_PATH}")

order_dates = {}
row_count = 0

with open(CSV_PATH, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        row_count += 1
        name = (row.get('Name') or '').strip()
        if not name:
            continue
            
        if name not in order_dates:
            created_raw = (row.get('Created at') or '').strip()
            paid_raw = (row.get('Paid at') or '').strip()
            fulfilled_raw = (row.get('Fulfilled at') or '').strip()
            cancelled_raw = (row.get('Cancelled at') or '').strip()
            
            created_dt = datetime.strptime(created_raw, '%Y-%m-%d %H:%M:%S %z') if created_raw else None
            paid_dt = datetime.strptime(paid_raw, '%Y-%m-%d %H:%M:%S %z') if paid_raw else None
            fulfilled_dt = datetime.strptime(fulfilled_raw, '%Y-%m-%d %H:%M:%S %z') if fulfilled_raw else None
            cancelled_dt = datetime.strptime(cancelled_raw, '%Y-%m-%d %H:%M:%S %z') if cancelled_raw else None
            
            updated_dt = cancelled_dt or fulfilled_dt or paid_dt or created_dt
            
            if created_dt:
                order_dates[name] = {
                    'order_number': name,
                    'created_at': created_dt,
                    'updated_at': updated_dt or created_dt,
                    'fulfilled_at': fulfilled_dt
                }

print(f"[*] Parsed {row_count:,} CSV rows into {len(order_dates):,} unique order records.")

# Prepare batch parameter list
batch_params = [
    {
        'order_number': data['order_number'],
        'created_at': data['created_at'],
        'updated_at': data['updated_at']
    }
    for data in order_dates.values()
]

print(f"[*] Updating PostgreSQL database (orders_order)...")

sql_update_orders = """
UPDATE orders_order
SET created_at = %(created_at)s,
    updated_at = %(updated_at)s
WHERE order_number = %(order_number)s
"""

with connection.cursor() as cursor:
    execute_batch(cursor.cursor, sql_update_orders, batch_params, page_size=500)
    
print(f"[*] Successfully executed batch updates for {len(batch_params):,} orders.")

# Update shipments created_at and dates to match order timestamps
print(f"[*] Aligning orders_shipment timestamps to real order dates...")
sql_update_shipments = """
UPDATE orders_shipment s
SET created_at = o.created_at,
    updated_at = COALESCE(s.delivered_at, s.shipped_at, o.updated_at, o.created_at),
    shipped_at = COALESCE(s.shipped_at, o.created_at),
    delivered_at = COALESCE(s.delivered_at, s.shipped_at, o.updated_at, o.created_at)
FROM orders_order o
WHERE s.order_id = o.id AND o.order_number LIKE 'PB%'
"""

with connection.cursor() as cursor:
    cursor.execute(sql_update_shipments)
    shipments_updated = cursor.rowcount
    print(f"[*] Aligned {shipments_updated:,} shipment records with real order timelines.")

# Verification queries
print("\n" + "=" * 80)
print("DATABASE VERIFICATION AFTER DATE CORRECTION")
print("=" * 80)

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT 
            COUNT(*) as total_orders,
            MIN(created_at) as earliest_order,
            MAX(created_at) as latest_order
        FROM orders_order
        WHERE order_number LIKE 'PB%'
    """)
    stats = cursor.fetchone()
    print(f"Total PB Orders in DB: {stats[0]:,}")
    print(f"Earliest Order Date  : {stats[1]}")
    print(f"Latest Order Date    : {stats[2]}")

    print("\nOrder Breakdown by Year:")
    cursor.execute("""
        SELECT 
            TO_CHAR(created_at, 'YYYY') as order_year,
            COUNT(*) as order_count,
            SUM(total) as year_total
        FROM orders_order
        WHERE order_number LIKE 'PB%'
        GROUP BY 1
        ORDER BY 1 ASC
    """)
    for row in cursor.fetchall():
        print(f"  Year {row[0]}: {row[1]:>5} orders | Total: ₹{row[2]:>12,.2f}")

    print("\nRecent 5 Orders in DB:")
    cursor.execute("""
        SELECT order_number, created_at, status, payment_status, total
        FROM orders_order
        WHERE order_number LIKE 'PB%'
        ORDER BY created_at DESC
        LIMIT 5
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]:<12} | Date: {row[1]} | Status: {row[2]:<10} | Payment: {row[3]:<8} | Total: ₹{row[4]}")

print("=" * 80)
print("[SUCCESS] All order dates have been restored to their real timestamps!")
