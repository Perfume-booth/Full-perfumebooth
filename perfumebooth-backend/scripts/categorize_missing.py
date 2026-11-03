import sys, os, csv
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()
from apps.authentication.models import CustomUser
from apps.orders.management.commands.import_shopify_data import clean_phone_str

with open('/app/data_exports/customers_export.csv', 'r', encoding='utf-8', errors='ignore') as f:
    rows = list(csv.DictReader(f))

db_emails = {u.email.lower().strip(): u for u in CustomUser.objects.all() if u.email}
existing_phones = {clean_phone_str(u.phone): u for u in CustomUser.objects.all() if u.phone}

cat1_enrich = []   # User exists with same phone, email is None -> enrich email
cat2_dup_phone = [] # User exists with same phone, email is different -> create with phone=None or note
cat3_new = []      # Neither email nor phone exists in DB -> create fresh user

for r in rows:
    em = (r.get('Email') or '').strip().lower()
    if em and em not in db_emails:
        raw_ph = r.get('Phone') or r.get('Default Address Phone') or ''
        clean_ph = clean_phone_str(raw_ph)
        if clean_ph and clean_ph in existing_phones:
            existing_u = existing_phones[clean_ph]
            if not existing_u.email:
                cat1_enrich.append((r, existing_u))
            else:
                cat2_dup_phone.append((r, existing_u))
        else:
            cat3_new.append(r)

print(f"Total missing: {len(cat1_enrich) + len(cat2_dup_phone) + len(cat3_new)}")
print(f"Cat 1 (Enrich existing phone-only user with email): {len(cat1_enrich)}")
for r, u in cat1_enrich:
    print(f"  - User {u.id}: phone={u.phone}, current email={u.email} -> Set email: {r.get('Email')}")

print(f"\nCat 2 (Create new user with duplicate phone note): {len(cat2_dup_phone)}")
for r, u in cat2_dup_phone:
    print(f"  - New user: {r.get('Email')} (Phone: {clean_phone_str(r.get('Phone'))} already used by {u.email})")

print(f"\nCat 3 (Brand new customer): {len(cat3_new)}")
for r in cat3_new:
    print(f"  - New user: {r.get('Email')} | Phone: {clean_phone_str(r.get('Phone'))} | Name: {r.get('First Name')} {r.get('Last Name')}")

