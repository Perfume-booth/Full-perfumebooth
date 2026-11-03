import csv
import sys
import os
import uuid
import re
from decimal import Decimal
from datetime import datetime
import zoneinfo

sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from django.db import transaction, connection
from apps.authentication.models import CustomUser, CustomerAddress
from apps.orders.models import Order, OrderItem, Shipment
from apps.shop.models import Product, ProductVariant

TZ_IST = zoneinfo.ZoneInfo('Asia/Kolkata')

def clean_phone_str(raw: str) -> str:
    if not raw:
        return ''
    cleaned = raw.strip().strip("'").strip('"').replace(' ', '').replace('-', '')
    if cleaned.startswith('+'):
        return '+' + re.sub(r'[^\d]', '', cleaned[1:])
    return re.sub(r'[^\d]', '', cleaned)

def normalize_10_digits(phone: str) -> str:
    cleaned = clean_phone_str(phone).replace('+', '')
    if cleaned.startswith('91') and len(cleaned) == 12:
        return cleaned[2:]
    if cleaned.startswith('0') and len(cleaned) == 11:
        return cleaned[1:]
    return cleaned

def parse_shopify_date(date_str: str):
    if not date_str:
        return None
    val = date_str.strip()
    try:
        return datetime.strptime(val, "%Y-%m-%d %H:%M:%S %z")
    except Exception:
        pass
    try:
        return datetime.fromisoformat(val)
    except Exception:
        return None

def reconcile(dry_run=True):
    print(f"=== STARTING RECONCILIATION (DRY RUN = {dry_run}) ===")

    # -------------------------------------------------------------
    # STEP 1: RECONCILE CUSTOMERS FROM customers_export.csv
    # -------------------------------------------------------------
    print("\n--- STEP 1: RECONCILING CUSTOMERS FROM customers_export.csv ---")
    with open('/app/data_exports/customers_export.csv', 'r', encoding='utf-8', errors='ignore') as f:
        cust_reader = csv.DictReader(f)
        cust_rows = list(cust_reader)

    db_users_by_email = {u.email.lower().strip(): u for u in CustomUser.objects.all() if u.email}
    db_users_by_phone = {clean_phone_str(u.phone): u for u in CustomUser.objects.all() if u.phone}
    db_users_by_10digit = {normalize_10_digits(u.phone): u for u in CustomUser.objects.all() if u.phone}

    enriched_users = 0
    created_users = 0
    created_addresses = 0

    for r in cust_rows:
        email = (r.get('Email') or '').strip().lower()
        if not email:
            continue
        
        raw_phone = r.get('Phone') or r.get('Default Address Phone') or ''
        phone = clean_phone_str(raw_phone) or None
        phone_10 = normalize_10_digits(phone) if phone else None
        first_name = (r.get('First Name') or '').strip()
        last_name = (r.get('Last Name') or '').strip()
        tags = (r.get('Tags') or '').strip()
        notes = (r.get('Note') or '').strip()

        # Check if user already exists by email
        if email in db_users_by_email:
            continue

        # Case A: User exists with this phone, but has NO email (phone-only user)
        phone_user = (db_users_by_phone.get(phone) or (db_users_by_10digit.get(phone_10) if phone_10 else None)) if phone else None
        if phone_user and not phone_user.email:
            print(f"  [Enrich Email] User {phone_user.id}: setting email='{email}' (phone={phone_user.phone})")
            if not dry_run:
                phone_user.email = email
                if first_name and not phone_user.first_name:
                    phone_user.first_name = first_name
                if last_name and not phone_user.last_name:
                    phone_user.last_name = last_name
                if tags:
                    phone_user.tags = tags
                phone_user.save()
            db_users_by_email[email] = phone_user
            enriched_users += 1

            # Check if address should be created
            addr1 = (r.get('Default Address Address1') or '').strip()
            city = (r.get('Default Address City') or '').strip()
            if (addr1 or city) and not phone_user.addresses.exists():
                print(f"  [Create Address] for enriched user {email}: {addr1}, {city}")
                if not dry_run:
                    CustomerAddress.objects.create(
                        user=phone_user,
                        first_name=first_name or phone_user.first_name,
                        last_name=last_name or phone_user.last_name,
                        address1=addr1,
                        address2=(r.get('Default Address Address2') or '').strip(),
                        city=city,
                        province=(r.get('Default Address Province Code') or '').strip(),
                        country=(r.get('Default Address Country Code') or 'IN').strip(),
                        zip=(r.get('Default Address Zip') or '').strip().strip("'"),
                        phone=phone or '',
                        is_default=True
                    )
                created_addresses += 1
            continue

        # Case B: Create new user
        # Check if phone is already taken by another user with a different email
        assigned_phone = phone
        user_notes = notes
        if phone:
            if phone in db_users_by_phone or (phone_10 and phone_10 in db_users_by_10digit):
                assigned_phone = None
                user_notes = (user_notes + f" | Shared phone: {phone}").strip(" |")
            else:
                db_users_by_phone[phone] = None
                if phone_10:
                    db_users_by_10digit[phone_10] = None

        print(f"  [Create User] Email='{email}', Phone='{assigned_phone}', Name='{first_name} {last_name}'")
        if not dry_run:
            new_user = CustomUser.objects.create(
                id=uuid.uuid4(),
                email=email,
                phone=assigned_phone,
                first_name=first_name,
                last_name=last_name,
                tags=tags,
                notes=user_notes,
                is_active=True,
                is_staff=False
            )
            db_users_by_email[email] = new_user
            if assigned_phone:
                db_users_by_phone[assigned_phone] = new_user
                if phone_10:
                    db_users_by_10digit[phone_10] = new_user
        else:
            new_user = CustomUser(id=uuid.uuid4(), email=email, phone=assigned_phone, first_name=first_name, last_name=last_name)
            db_users_by_email[email] = new_user
        created_users += 1

        # Create address if present
        addr1 = (r.get('Default Address Address1') or '').strip()
        city = (r.get('Default Address City') or '').strip()
        if addr1 or city:
            print(f"  [Create Address] for new user {email}: {addr1}, {city}")
            if not dry_run:
                CustomerAddress.objects.create(
                    user=new_user,
                    first_name=first_name,
                    last_name=last_name,
                    address1=addr1,
                    address2=(r.get('Default Address Address2') or '').strip(),
                    city=city,
                    province=(r.get('Default Address Province Code') or '').strip(),
                    country=(r.get('Default Address Country Code') or 'IN').strip(),
                    zip=(r.get('Default Address Zip') or '').strip().strip("'"),
                    phone=phone or '',
                    is_default=True
                )
            created_addresses += 1

    print(f"Summary Customers: Enriched: {enriched_users}, Created Users: {created_users}, Created Addresses: {created_addresses}")

    # -------------------------------------------------------------
    # STEP 2: ENRICH USERS WHO PLACED ORDERS WITH EMAIL BUT HAD NO EMAIL IN CustomUser
    # -------------------------------------------------------------
    print("\n--- STEP 2: ENRICHING PHONE-ONLY USERS FROM THEIR ORDERS ---")
    order_enrich_count = 0
    for order in Order.objects.all():
        c_email = (order.customer_email or '').strip().lower()
        if not c_email:
            continue
        if c_email in db_users_by_email:
            continue
        if order.user and not order.user.email:
            print(f"  [Order Email Enrich] User {order.user.id} ({order.user.phone}) -> set email='{c_email}' from order {order.order_number}")
            if not dry_run:
                order.user.email = c_email
                order.user.save(update_fields=['email'])
            db_users_by_email[c_email] = order.user
            order_enrich_count += 1
    print(f"Summary Order Users Enriched: {order_enrich_count}")

    # -------------------------------------------------------------
    # STEP 3: RECONCILE MISSING ORDERS (PB1002343 & PB1002342)
    # -------------------------------------------------------------
    print("\n--- STEP 3: RECONCILING MISSING ORDERS (PB1002343 & PB1002342) ---")
    missing_order_names = {'PB1002343', 'PB1002342'}
    with open('/app/data_exports/orders_export_1.csv', 'r', encoding='utf-8', errors='ignore') as f:
        ord_reader = csv.DictReader(f)
        all_order_rows = list(ord_reader)

    # Cache products and variants
    products_by_sku = {}
    products_by_title = {}
    for p in Product.objects.all():
        if p.sku:
            products_by_sku[p.sku.strip().upper()] = p
        if p.title:
            products_by_title[p.title.strip().lower()] = p

    variants_by_sku = {}
    for v in ProductVariant.objects.select_related('product').all():
        if v.sku:
            variants_by_sku[v.sku.strip().upper()] = v

    # Group rows by order name
    orders_data = {}
    for r in all_order_rows:
        name = r.get('Name', '').strip()
        if name in missing_order_names:
            if name not in orders_data:
                orders_data[name] = []
            orders_data[name].append(r)

    created_orders_count = 0
    created_items_count = 0
    date_fix_params = []

    for name in sorted(orders_data.keys(), reverse=True):
        rows = orders_data[name]
        if Order.objects.filter(order_number=name).exists():
            print(f"  Order {name} already exists in DB!")
            continue

        r0 = rows[0]
        order_email = (r0.get('Email') or '').strip().lower()
        raw_phone = r0.get('Phone') or r0.get('Billing Phone') or ''
        order_phone = clean_phone_str(raw_phone)
        order_phone_10 = normalize_10_digits(order_phone)
        created_at_dt = parse_shopify_date(r0.get('Created at'))
        financial_status = (r0.get('Financial Status') or 'pending').strip().lower()
        fulfillment_status = (r0.get('Fulfillment Status') or 'unfulfilled').strip().lower()

        # Find user
        user = db_users_by_email.get(order_email)
        if not user and order_phone:
            user = db_users_by_phone.get(order_phone) or db_users_by_10digit.get(order_phone_10)

        # Status resolution
        if fulfillment_status == 'fulfilled':
            order_status = Order.Status.DELIVERED
        elif financial_status == 'paid':
            order_status = Order.Status.PAID
        else:
            order_status = Order.Status.PENDING

        payment_status = Order.PaymentStatus.PAID if financial_status == 'paid' else Order.PaymentStatus.PENDING
        raw_method = (r0.get('Payment Method') or '').strip()
        payment_method = Order.PaymentMethod.COD if ('cod' in raw_method.lower() or 'cash on delivery' in raw_method.lower()) else Order.PaymentMethod.RAZORPAY

        subtotal = Decimal(r0.get('Subtotal') or '0.00')
        shipping = Decimal(r0.get('Shipping') or '0.00')
        tax = Decimal(r0.get('Taxes') or '0.00')
        total = Decimal(r0.get('Total') or '0.00')
        discount = Decimal(r0.get('Discount Amount') or '0.00')

        shipping_first = (r0.get('Shipping Name') or r0.get('Billing Name') or '').strip()
        shipping_address_data = {
            'first_name': shipping_first,
            'last_name': '',
            'address1': r0.get('Shipping Address1') or r0.get('Shipping Street') or r0.get('Billing Address1') or '',
            'address2': r0.get('Shipping Address2') or '',
            'city': r0.get('Shipping City') or r0.get('Billing City') or '',
            'province': r0.get('Shipping Province') or r0.get('Shipping Province Name') or r0.get('Billing Province') or '',
            'zip': str(r0.get('Shipping Zip') or r0.get('Billing Zip') or '').strip().strip("'"),
            'country': r0.get('Shipping Country') or r0.get('Billing Country') or 'India',
            'phone': order_phone,
            'shipping_carrier': r0.get('Shipping Method') or 'Standard Shipping',
            'raw_payment_method': raw_method,
        }

        order_id = uuid.uuid4()
        user_display = f"{user.email} ({user.phone})" if user else "None"
        print(f"  [Create Order] {name}: User={user_display}, Total={total}, Items={len(rows)}, CreatedAt={created_at_dt}")

        if not dry_run:
            new_order = Order.objects.create(
                id=order_id,
                user=user,
                order_number=name,
                status=order_status,
                payment_method=payment_method,
                payment_status=payment_status,
                subtotal=subtotal,
                discount_amount=discount,
                shipping_amount=shipping,
                tax_amount=tax,
                total=total,
                currency=r0.get('Currency') or 'INR',
                shipping_address=shipping_address_data,
                customer_email=order_email,
                customer_phone=order_phone,
                coupon_code=(r0.get('Discount Code') or '').strip(),
            )
            date_fix_params.append({'num': name, 'c': created_at_dt, 'u': created_at_dt})

            # Create OrderItems
            for line in rows:
                item_sku = (line.get('Lineitem sku') or '').strip().upper()
                item_name = (line.get('Lineitem name') or '').strip()
                qty = int(line.get('Lineitem quantity') or 1)
                price = Decimal(line.get('Lineitem price') or '0.00')

                matched_variant = variants_by_sku.get(item_sku) if item_sku else None
                matched_product = matched_variant.product if matched_variant else products_by_sku.get(item_sku)
                if not matched_product and item_name:
                    matched_product = products_by_title.get(item_name.lower())

                brand = ''
                if matched_product and isinstance(matched_product.attributes, dict):
                    brand = matched_product.attributes.get('brand') or ''
                if not brand:
                    brand = line.get('Vendor') or ''

                category = ''
                if matched_product and isinstance(matched_product.attributes, dict):
                    category = matched_product.attributes.get('category') or ''

                OrderItem.objects.create(
                    id=uuid.uuid4(),
                    order=new_order,
                    product=matched_product,
                    variant=matched_variant,
                    product_title=item_name or 'Perfume Item',
                    variant_title=matched_variant.title if matched_variant else '',
                    sku=item_sku or (matched_product.sku if matched_product else ''),
                    quantity=qty,
                    unit_price=price,
                    brand_snapshot=brand or '',
                    category_snapshot=category or '',
                    unit_cost_snapshot=matched_variant.cost_price if (matched_variant and matched_variant.cost_price) else None
                )
                created_items_count += 1

            # Create Shipment if fulfilled
            if fulfillment_status == 'fulfilled':
                Shipment.objects.create(
                    id=uuid.uuid4(),
                    order=new_order,
                    provider='shiprocket',
                    courier_name=r0.get('Shipping Method') or 'Standard Courier',
                    status=Shipment.Status.DELIVERED,
                    shipped_at=created_at_dt,
                    delivered_at=created_at_dt,
                )
        created_orders_count += 1

    # Fix dates via direct SQL
    if not dry_run and date_fix_params:
        with connection.cursor() as cursor:
            for p in date_fix_params:
                cursor.execute(
                    "UPDATE orders_order SET created_at = %s, updated_at = %s WHERE order_number = %s",
                    [p['c'], p['u'], p['num']]
                )
        print(f"  [Date Fix] Restored exact timestamps for {len(date_fix_params)} orders.")

    # -------------------------------------------------------------
    # STEP 4: RE-LINK ORDERS TO TRUE CUSTOMERS
    # -------------------------------------------------------------
    print("\n--- STEP 4: RE-LINKING ORDERS TO TRUE CUSTOMERS ---")
    relinked_orders = 0
    for order in Order.objects.all():
        correct_user = None
        c_email = (order.customer_email or '').strip().lower()
        c_phone = clean_phone_str(order.customer_phone)
        c_phone_10 = normalize_10_digits(c_phone)

        # Priority 1: Match by customer_email
        if c_email and c_email in db_users_by_email:
            correct_user = db_users_by_email[c_email]
        # Priority 2: Match by phone (for guest / phone-only orders)
        elif c_phone and (c_phone in db_users_by_phone or c_phone_10 in db_users_by_10digit):
            correct_user = db_users_by_phone.get(c_phone) or db_users_by_10digit.get(c_phone_10)

        if correct_user and order.user_id != correct_user.id:
            old_user_str = f"{order.user.email} ({order.user.phone})" if order.user else "None"
            new_user_str = f"{correct_user.email} ({correct_user.phone})"
            print(f"  [Relink] Order {order.order_number}: {old_user_str} -> {new_user_str}")
            if not dry_run:
                order.user = correct_user
                order.save(update_fields=['user'])
            relinked_orders += 1

    print(f"Summary Orders Relinked: {relinked_orders}")
    print("\n=== RECONCILIATION SUMMARY ===")
    print(f"• Customers Enriched:       {enriched_users}")
    print(f"• Customers Created:        {created_users}")
    print(f"• Customer Addresses:       {created_addresses}")
    print(f"• Order Phone Users Enriched: {order_enrich_count}")
    print(f"• Missing Orders Inserted:  {created_orders_count}")
    print(f"• Orders Relinked:          {relinked_orders}")

if __name__ == '__main__':
    dry_run = '--execute' not in sys.argv
    if dry_run:
        with transaction.atomic():
            reconcile(dry_run=True)
            transaction.set_rollback(True)
        print("\nDRY RUN COMPLETE: All checks passed. Use --execute to commit to database.")
    else:
        with transaction.atomic():
            reconcile(dry_run=False)
        print("\nEXECUTION COMPLETE: All records successfully reconciled and committed to database!")
