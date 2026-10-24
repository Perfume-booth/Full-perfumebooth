import csv
import logging
import re
import uuid
from decimal import Decimal
from datetime import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.authentication.models import CustomUser, CustomerAddress
from apps.orders.models import Order, OrderItem, Shipment
from apps.shop.models import Product, ProductVariant

logger = logging.getLogger(__name__)


def clean_phone_str(raw: str) -> str:
    """Normalize phone number to digits with optional leading +."""
    if not raw:
        return ''
    cleaned = raw.strip().strip("'").strip('"').replace(' ', '').replace('-', '')
    if cleaned.startswith('+'):
        return '+' + re.sub(r'[^\d]', '', cleaned[1:])
    return re.sub(r'[^\d]', '', cleaned)


def parse_shopify_date(date_str: str):
    """Parse dates like 2026-10-13 10:18:43 +0530."""
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


class Command(BaseCommand):
    help = "Imports customers and orders from Shopify CSV exports into PerfumeBooth database."

    def add_arguments(self, parser):
        parser.add_argument(
            '--customers',
            type=str,
            default='/tmp/customers_export.csv',
            help='Path to customers_export.csv'
        )
        parser.add_argument(
            '--orders',
            type=str,
            default='/tmp/orders_export_1.csv',
            help='Path to orders_export_1.csv'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for bulk_create operations'
        )

    def handle(self, *args, **options):
        customers_path = options['customers']
        orders_path = options['orders']
        batch_size = options['batch_size']

        self.stdout.write(self.style.NOTICE(f"==> Starting Shopify Import Process"))
        self.stdout.write(f"Customers file: {customers_path}")
        self.stdout.write(f"Orders file:    {orders_path}")

        # -------------------------------------------------------------
        # Phase 1: Load Existing Users & Products Cache for Fast Linking
        # -------------------------------------------------------------
        self.stdout.write(self.style.NOTICE("\n==> Loading existing database indices..."))
        existing_users_by_email = {}
        existing_users_by_phone = {}
        for u in CustomUser.objects.values('id', 'email', 'phone'):
            if u['email']:
                existing_users_by_email[u['email'].strip().lower()] = u['id']
            if u['phone']:
                existing_users_by_phone[clean_phone_str(u['phone'])] = u['id']

        self.stdout.write(f"Loaded {len(existing_users_by_email)} existing user emails, {len(existing_users_by_phone)} phones.")

        sku_to_product = {}
        title_to_product = {}
        for p in Product.objects.all():
            if p.sku:
                sku_to_product[p.sku.strip().upper()] = p
            if p.title:
                title_to_product[p.title.strip().lower()] = p

        sku_to_variant = {}
        for v in ProductVariant.objects.select_related('product').all():
            if v.sku:
                sku_to_variant[v.sku.strip().upper()] = v

        self.stdout.write(f"Loaded {len(sku_to_product)} product SKUs, {len(sku_to_variant)} variant SKUs.")

        # -------------------------------------------------------------
        # Phase 2: Import Customers
        # -------------------------------------------------------------
        self.stdout.write(self.style.NOTICE("\n==> Phase 2: Processing Customers CSV..."))
        new_users = []
        new_addresses = []
        seen_phones = set(existing_users_by_phone.keys())
        seen_emails = set(existing_users_by_email.keys())

        total_customer_rows = 0
        skipped_customers = 0

        with open(customers_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_customer_rows += 1
                email = (row.get('Email') or '').strip().lower()
                raw_phone = row.get('Phone') or row.get('Default Address Phone') or ''
                phone = clean_phone_str(raw_phone)
                shopify_id = (row.get('Customer ID') or '').strip().strip("'")

                # If both email and phone are empty, generate an anonymous placeholder email
                if not email and not phone:
                    if shopify_id:
                        email = f"customer_{shopify_id}@perfumebooth.internal"
                    else:
                        continue

                # Check if user already exists
                user_id = None
                if email and email in existing_users_by_email:
                    user_id = existing_users_by_email[email]
                    skipped_customers += 1
                elif phone and phone in existing_users_by_phone:
                    user_id = existing_users_by_phone[phone]
                    skipped_customers += 1

                if user_id:
                    if email:
                        existing_users_by_email[email] = user_id
                    if phone:
                        existing_users_by_phone[phone] = user_id
                    continue

                # Handle duplicate phone numbers to prevent unique constraint crash
                assigned_phone = phone
                dup_phone_note = ""
                if phone:
                    if phone in seen_phones:
                        assigned_phone = None
                        dup_phone_note = f"Duplicate Phone: {phone}"
                    else:
                        seen_phones.add(phone)

                if email:
                    seen_emails.add(email)

                # Prepare tags
                raw_tags = (row.get('Tags') or '').strip()
                tag_list = [t.strip() for t in raw_tags.split(',') if t.strip()] if raw_tags else []
                if row.get('Accepts Email Marketing') == 'yes':
                    tag_list.append('accepts_email_marketing')
                if row.get('Accepts SMS Marketing') == 'yes':
                    tag_list.append('accepts_sms_marketing')
                if row.get('Accepts WhatsApp Marketing') == 'yes':
                    tag_list.append('accepts_whatsapp_marketing')

                # Prepare notes
                notes_parts = []
                if shopify_id:
                    notes_parts.append(f"Shopify Customer ID: {shopify_id}")
                if row.get('Note'):
                    notes_parts.append(row['Note'].strip())
                if dup_phone_note:
                    notes_parts.append(dup_phone_note)
                if row.get('Total Spent'):
                    notes_parts.append(f"Historical Total Spent: ₹{row.get('Total Spent')}")
                if row.get('Total Orders'):
                    notes_parts.append(f"Historical Total Orders: {row.get('Total Orders')}")

                new_user_id = uuid.uuid4()
                first_name = (row.get('First Name') or '').strip()[:150]
                last_name = (row.get('Last Name') or '').strip()[:150]

                user = CustomUser(
                    id=new_user_id,
                    email=email or None,
                    phone=assigned_phone or None,
                    first_name=first_name,
                    last_name=last_name,
                    password='!',  # Unusable password until reset
                    is_staff=False,
                    is_active=True,
                    tags=tag_list,
                    notes="\n".join(notes_parts)
                )
                new_users.append(user)

                if email:
                    existing_users_by_email[email] = new_user_id
                if assigned_phone:
                    existing_users_by_phone[assigned_phone] = new_user_id
                elif phone:
                    existing_users_by_phone[phone] = new_user_id

                # Prepare address if available
                addr1 = (row.get('Default Address Address1') or '').strip()
                city = (row.get('Default Address City') or '').strip()
                if addr1 or city:
                    addr2 = (row.get('Default Address Address2') or row.get('Default Address Company') or '').strip()
                    province = (row.get('Default Address Province Code') or '').strip()
                    country = (row.get('Default Address Country Code') or 'India').strip()
                    zip_code = (row.get('Default Address Zip') or '').strip().strip("'")
                    addr_phone = clean_phone_str(row.get('Default Address Phone') or raw_phone)

                    address = CustomerAddress(
                        id=uuid.uuid4(),
                        user_id=new_user_id,
                        first_name=first_name,
                        last_name=last_name,
                        address1=addr1[:255] if addr1 else city[:255],
                        address2=addr2[:255],
                        city=city[:100] if city else 'N/A',
                        province=province[:100],
                        country=country[:100],
                        zip=zip_code[:20] if zip_code else '000000',
                        phone=addr_phone[:20],
                        is_default=True
                    )
                    new_addresses.append(address)

        if new_users:
            self.stdout.write(f"Writing {len(new_users)} customers to database...")
            CustomUser.objects.bulk_create(new_users, batch_size=batch_size)
            self.stdout.write(self.style.SUCCESS(f"Successfully inserted {len(new_users)} CustomUser records."))

        if new_addresses:
            self.stdout.write(f"Writing {len(new_addresses)} addresses to database...")
            CustomerAddress.objects.bulk_create(new_addresses, batch_size=batch_size)
            self.stdout.write(self.style.SUCCESS(f"Successfully inserted {len(new_addresses)} CustomerAddress records."))

        # -------------------------------------------------------------
        # Phase 3: Import Orders
        # -------------------------------------------------------------
        self.stdout.write(self.style.NOTICE("\n==> Phase 3: Processing Orders CSV..."))
        order_groups = {}
        with open(orders_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get('Name') or '').strip()
                if not name:
                    continue
                if name not in order_groups:
                    order_groups[name] = []
                order_groups[name].append(row)

        self.stdout.write(f"Found {len(order_groups)} distinct orders in CSV.")

        # Check existing orders and order items in DB
        existing_orders_map = {o.order_number: o for o in Order.objects.all()}
        orders_with_items = set(OrderItem.objects.values_list('order_id', flat=True))
        orders_with_shipments = set(Shipment.objects.values_list('order_id', flat=True))
        seen_payment_intents = set(
            Order.objects.exclude(payment_intent_id__isnull=True).exclude(payment_intent_id='').values_list('payment_intent_id', flat=True)
        )

        self.stdout.write(f"Existing orders in DB: {len(existing_orders_map)}, orders with items: {len(orders_with_items)}")

        new_orders = []
        new_items = []
        new_shipments = []
        skipped_orders = 0

        for order_name, rows in order_groups.items():
            r0 = rows[0]  # Order header info is on first row

            order_email = (r0.get('Email') or '').strip().lower()
            order_phone = clean_phone_str(r0.get('Phone') or r0.get('Shipping Phone') or r0.get('Billing Phone') or '')

            # Match user FK
            user_id = None
            if order_email and order_email in existing_users_by_email:
                user_id = existing_users_by_email[order_email]
            elif order_phone and order_phone in existing_users_by_phone:
                user_id = existing_users_by_phone[order_phone]

            # If user not found, create customer profile
            if not user_id and (order_email or order_phone):
                user_id = uuid.uuid4()
                cust_first = (r0.get('Shipping Name') or r0.get('Billing Name') or '').strip()
                user = CustomUser(
                    id=user_id,
                    email=order_email or None,
                    phone=order_phone if (order_phone and order_phone not in seen_phones) else None,
                    first_name=cust_first[:150],
                    is_staff=False,
                    is_active=True,
                    password='!'
                )
                user.save()
                if order_email:
                    existing_users_by_email[order_email] = user_id
                if order_phone and order_phone not in seen_phones:
                    seen_phones.add(order_phone)
                    existing_users_by_phone[order_phone] = user_id

            # Parse dates
            created_at = parse_shopify_date(r0.get('Created at')) or timezone.now()
            paid_at = parse_shopify_date(r0.get('Paid at'))
            fulfilled_at = parse_shopify_date(r0.get('Fulfilled at'))
            cancelled_at = parse_shopify_date(r0.get('Cancelled at'))

            # Status resolution
            financial_status = (r0.get('Financial Status') or 'pending').strip().lower()
            fulfillment_status = (r0.get('Fulfillment Status') or 'unfulfilled').strip().lower()

            if cancelled_at:
                order_status = Order.Status.CANCELLED
            elif financial_status == 'refunded':
                order_status = Order.Status.REFUNDED
            elif fulfillment_status == 'fulfilled':
                order_status = Order.Status.DELIVERED
            elif financial_status == 'paid':
                order_status = Order.Status.PAID
            else:
                order_status = Order.Status.PENDING

            # Payment status resolution
            if financial_status == 'paid':
                payment_status = Order.PaymentStatus.PAID
            elif financial_status == 'refunded':
                payment_status = Order.PaymentStatus.REFUNDED
            elif financial_status == 'voided':
                payment_status = Order.PaymentStatus.CANCELLED
            else:
                payment_status = Order.PaymentStatus.PENDING

            # Payment method resolution
            raw_method = (r0.get('Payment Method') or '').strip()
            if 'cod' in raw_method.lower() or 'cash on delivery' in raw_method.lower():
                payment_method = Order.PaymentMethod.COD
            else:
                payment_method = Order.PaymentMethod.RAZORPAY

            # Extract Razorpay Payment / Order IDs
            note_attrs = r0.get('Note Attributes') or ''
            razorpay_pay_id = ''
            razorpay_ord_id = ''
            if 'razorpay_payment_id:' in note_attrs:
                m = re.search(r'razorpay_payment_id:\s*([^\s\n]+)', note_attrs)
                if m:
                    razorpay_pay_id = m.group(1).strip()
            if 'razorpay_order_id:' in note_attrs:
                m = re.search(r'razorpay_order_id:\s*([^\s\n]+)', note_attrs)
                if m:
                    razorpay_ord_id = m.group(1).strip()

            if not razorpay_pay_id and r0.get('Payment ID'):
                razorpay_pay_id = r0.get('Payment ID').strip()

            payment_intent = razorpay_pay_id or razorpay_ord_id or r0.get('Payment Reference') or None
            assigned_payment_intent = None
            if payment_intent:
                if payment_intent not in seen_payment_intents:
                    assigned_payment_intent = payment_intent
                    seen_payment_intents.add(payment_intent)

            # Financial figures
            try:
                subtotal = Decimal(r0.get('Subtotal') or '0.00')
            except Exception:
                subtotal = Decimal('0.00')

            try:
                shipping_amount = Decimal(r0.get('Shipping') or '0.00')
            except Exception:
                shipping_amount = Decimal('0.00')

            try:
                tax_amount = Decimal(r0.get('Taxes') or '0.00')
            except Exception:
                tax_amount = Decimal('0.00')

            try:
                total = Decimal(r0.get('Total') or '0.00')
            except Exception:
                total = Decimal('0.00')

            try:
                discount_amount = Decimal(r0.get('Discount Amount') or '0.00')
            except Exception:
                discount_amount = Decimal('0.00')

            # Shipping snapshot
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

            # If order already exists in DB, reuse its ID
            if order_name in existing_orders_map:
                order = existing_orders_map[order_name]
                order_id = order.id
            else:
                order_id = uuid.uuid4()
                order = Order(
                    id=order_id,
                    user_id=user_id,
                    order_number=order_name,
                    status=order_status,
                    payment_method=payment_method,
                    payment_status=payment_status,
                    payment_intent_id=assigned_payment_intent,
                    subtotal=subtotal,
                    discount_amount=discount_amount,
                    shipping_amount=shipping_amount,
                    tax_amount=tax_amount,
                    total=total,
                    currency=r0.get('Currency') or 'INR',
                    shipping_address=shipping_address_data,
                    customer_email=order_email,
                    customer_phone=order_phone,
                    coupon_code=(r0.get('Discount Code') or '').strip(),
                    created_at=created_at,
                    updated_at=fulfilled_at or paid_at or created_at
                )
                new_orders.append(order)
                existing_orders_map[order_name] = order

            # Order items (create if order does not have items yet)
            if order_id not in orders_with_items:
                for line in rows:
                    item_sku = (line.get('Lineitem sku') or '').strip().upper()
                    item_name = (line.get('Lineitem name') or '').strip()
                    try:
                        qty = int(line.get('Lineitem quantity') or 1)
                    except Exception:
                        qty = 1

                    try:
                        price = Decimal(line.get('Lineitem price') or '0.00')
                    except Exception:
                        price = Decimal('0.00')

                    # Link product / variant
                    matched_product = None
                    matched_variant = None

                    if item_sku:
                        matched_variant = sku_to_variant.get(item_sku)
                        if matched_variant:
                            matched_product = matched_variant.product
                        else:
                            matched_product = sku_to_product.get(item_sku)

                    if not matched_product and item_name:
                        matched_product = title_to_product.get(item_name.lower())

                    brand = ''
                    if matched_product and isinstance(matched_product.attributes, dict):
                        brand = matched_product.attributes.get('brand') or ''
                    if not brand:
                        brand = line.get('Vendor') or ''

                    category = ''
                    if matched_product and isinstance(matched_product.attributes, dict):
                        category = matched_product.attributes.get('category') or ''

                    item = OrderItem(
                        id=uuid.uuid4(),
                        order_id=order_id,
                        product=matched_product,
                        variant=matched_variant,
                        product_title=item_name or 'Perfume Item',
                        variant_title=matched_variant.title if matched_variant else '',
                        sku=item_sku or '',
                        quantity=qty,
                        unit_price=price,
                        brand_snapshot=brand or '',
                        category_snapshot=category or '',
                        unit_cost_snapshot=matched_variant.cost_price if (matched_variant and matched_variant.cost_price) else None
                    )
                    new_items.append(item)
                orders_with_items.add(order_id)

            # Create shipment if fulfilled and not already present
            if fulfillment_status == 'fulfilled' and order_id not in orders_with_shipments:
                shipment = Shipment(
                    id=uuid.uuid4(),
                    order_id=order_id,
                    provider='shiprocket',
                    provider_order_id='',
                    provider_shipment_id='',
                    awb_code='',
                    courier_name=r0.get('Shipping Method') or 'Standard Courier',
                    tracking_url='',
                    status=Shipment.Status.DELIVERED,
                    shipped_at=fulfilled_at or created_at,
                    delivered_at=fulfilled_at or created_at,
                    created_at=created_at,
                    updated_at=fulfilled_at or created_at
                )
                new_shipments.append(shipment)
                orders_with_shipments.add(order_id)

        # Bulk save orders and related models
        if new_orders:
            self.stdout.write(f"Writing {len(new_orders)} orders to database in batches...")
            Order.objects.bulk_create(new_orders, batch_size=batch_size)
            self.stdout.write(self.style.SUCCESS(f"Successfully inserted {len(new_orders)} Order records."))

            # auto_now_add=True on Order.created_at forces current timestamp on bulk_create.
            # Perform direct SQL batch update to preserve exact historical order timestamps.
            from psycopg2.extras import execute_batch
            from django.db import connection
            date_params = [{'num': o.order_number, 'c': o.created_at, 'u': o.updated_at} for o in new_orders]
            with connection.cursor() as cursor:
                execute_batch(cursor.cursor, "UPDATE orders_order SET created_at = %(c)s, updated_at = %(u)s WHERE order_number = %(num)s", date_params, page_size=500)
            self.stdout.write(self.style.SUCCESS(f"Restored real historical timestamps for {len(new_orders)} orders."))

        if new_items:
            self.stdout.write(f"Writing {len(new_items)} order items to database in batches...")
            OrderItem.objects.bulk_create(new_items, batch_size=batch_size)
            self.stdout.write(self.style.SUCCESS(f"Successfully inserted {len(new_items)} OrderItem records."))

        if new_shipments:
            self.stdout.write(f"Writing {len(new_shipments)} shipments to database in batches...")
            Shipment.objects.bulk_create(new_shipments, batch_size=batch_size)
            self.stdout.write(self.style.SUCCESS(f"Successfully inserted {len(new_shipments)} Shipment records."))

        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 SHOPIFY DATA IMPORT COMPLETE!\n"
            f"• Total DB Users:       {CustomUser.objects.count()}\n"
            f"• Total DB Addresses:   {CustomerAddress.objects.count()}\n"
            f"• Total DB Orders:      {Order.objects.count()}\n"
            f"• Total DB Order Items: {OrderItem.objects.count()}\n"
            f"• Total DB Shipments:   {Shipment.objects.count()}\n"
        ))
