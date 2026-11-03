import sys, os, csv
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()
from apps.authentication.models import CustomUser

with open('/app/data_exports/customers_export.csv', 'r', encoding='utf-8', errors='ignore') as f:
    rows = list(csv.DictReader(f))

db_emails = {u.email.lower().strip(): u for u in CustomUser.objects.all() if u.email}
for r in rows:
    em = (r.get('Email') or '').strip().lower()
    if em and em not in db_emails:
        ph = (r.get('Phone') or r.get('Default Address Phone') or '').strip()
        ph_clean = ph.replace(' ', '').replace('-', '').replace('+', '').replace("'", "")
        if ph_clean.startswith('91') and len(ph_clean) == 12:
            ph_clean = ph_clean[2:]
        matched_user = CustomUser.objects.filter(phone__icontains=ph_clean).first() if ph_clean else None
        print(f"Email: {em} | CSV Phone: {ph} | Matched DB User by phone: {matched_user.email if matched_user else None} ({matched_user.phone if matched_user else None})")

