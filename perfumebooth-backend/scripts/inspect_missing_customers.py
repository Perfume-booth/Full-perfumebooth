import csv
import sys
import os

sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.authentication.models import CustomUser

db_emails = {u.email.lower().strip() for u in CustomUser.objects.all() if u.email}
with open('/app/data_exports/customers_export.csv', 'r', encoding='utf-8', errors='ignore') as f:
    rows = list(csv.DictReader(f))

missing = []
for r in rows:
    em = (r.get('Email') or '').strip().lower()
    if em and em not in db_emails:
        missing.append(r)

print(f'Total missing customer rows: {len(missing)}')
for i, m in enumerate(missing, 1):
    print(f"{i}. Email: {m.get('Email')} | Name: {m.get('First Name')} {m.get('Last Name')} | Phone: {m.get('Phone')} | Orders: {m.get('Total Orders')} | Created: {m.get('Created at')}")

