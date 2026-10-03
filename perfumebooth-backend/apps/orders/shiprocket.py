import json
import logging
import requests
from decimal import Decimal
from django.conf import settings
from django.core.cache import cache
from .models import Shipment

logger = logging.getLogger(__name__)

SHIPROCKET_BASE_URL = getattr(settings, 'SHIPROCKET_API_URL', 'https://apiv2.shiprocket.in/v1/external')
SHIPROCKET_EMAIL = getattr(settings, 'SHIPROCKET_EMAIL', '')
SHIPROCKET_PASSWORD = getattr(settings, 'SHIPROCKET_PASSWORD', '')
SHIPROCKET_PICKUP_PINCODE = getattr(settings, 'SHIPROCKET_PICKUP_PINCODE', '110001')
SHIPROCKET_PICKUP_LOCATION = getattr(settings, 'SHIPROCKET_PICKUP_LOCATION', 'Primary Warehouse')

TOKEN_CACHE_KEY = 'shiprocket_auth_token'


def get_shiprocket_token() -> str | None:
    """
    Retrieves or generates a cached Shiprocket API authentication token.
    Caches token in Redis for 8 days.
    """
    token = cache.get(TOKEN_CACHE_KEY)
    if token:
        return token

    if not SHIPROCKET_EMAIL or not SHIPROCKET_PASSWORD:
        logger.warning("Shiprocket credentials missing. Skipping auth.")
        return None

    try:
        res = requests.post(
            f"{SHIPROCKET_BASE_URL}/auth/login",
            json={"email": SHIPROCKET_EMAIL, "password": SHIPROCKET_PASSWORD},
            timeout=10
        )
        if res.status_code == 200:
            data = res.json()
            new_token = data.get('token')
            if new_token:
                # Cache token for 8 days (691200 seconds)
                cache.set(TOKEN_CACHE_KEY, new_token, timeout=691200)
                return new_token
        logger.error(f"Shiprocket auth failed: {res.status_code} - {res.text}")
    except Exception as e:
        logger.error(f"Shiprocket auth exception: {e}")

    return None


def check_serviceability(delivery_postcode: str, weight: float = 0.5, is_cod: bool = False) -> dict:
    """
    Calculates courier serviceability & shipping rates.
    """
    token = get_shiprocket_token()

    # Graceful Fallback if Shiprocket token is missing or call fails
    fallback_response = {
        'serviceable': True,
        'rates': [
            {'courier_name': 'Standard Delivery', 'rate': 99.00, 'etd': '3-5 Days', 'is_express': False},
            {'courier_name': 'Express Air Delivery', 'rate': 149.00, 'etd': '1-2 Days', 'is_express': True}
        ]
    }

    if not token:
        return fallback_response

    try:
        params = {
            'pickup_postcode': SHIPROCKET_PICKUP_PINCODE,
            'delivery_postcode': delivery_postcode,
            'weight': weight,
            'cod': 1 if is_cod else 0
        }
        res = requests.get(
            f"{SHIPROCKET_BASE_URL}/courier/serviceability/",
            headers={'Authorization': f'Bearer {token}'},
            params=params,
            timeout=10
        )

        if res.status_code == 200:
            data = res.json()
            courier_data = data.get('data', {}).get('available_courier_companies', [])
            rates = []

            for company in courier_data:
                rates.append({
                    'courier_name': company.get('courier_name'),
                    'courier_company_id': company.get('courier_company_id'),
                    'rate': float(company.get('rate', 99)),
                    'etd': company.get('etd', '3-5 Days'),
                    'is_express': company.get('air_max', 0) > 0
                })

            if rates:
                return {
                    'serviceable': True,
                    'rates': sorted(rates, key=lambda x: x['rate'])
                }

    except Exception as e:
        logger.error(f"Shiprocket serviceability exception: {e}")

    return fallback_response


def create_shiprocket_order(order) -> dict:
    """
    Pushes an internal order to Shiprocket for fulfillment.
    """
    token = get_shiprocket_token()
    if not token:
        return {'success': False, 'reason': 'Shiprocket auth token unavailable'}

    addr = order.shipping_address or {}
    items = order.items.all()

    shipment_items = []
    total_weight = 0.0

    for item in items:
        prod = item.product
        qty = item.quantity
        price = float(item.unit_price)

        weight = 0.5  # default 0.5kg per bottle
        if prod and hasattr(prod, 'attributes') and prod.attributes:
            weight = float(prod.attributes.get('weight', 0.5))

        total_weight += weight * qty

        shipment_items.append({
            'name': prod.title if prod else 'Perfume Item',
            'sku': prod.sku if prod else f'SKU-{item.id}',
            'units': qty,
            'selling_price': price,
            'discount': 0,
            'tax': 0,
            'hsn': 33073000
        })

    payload = {
        'order_id': str(order.order_number),
        'order_date': order.created_at.strftime('%Y-%m-%d %H:%M'),
        'pickup_location': SHIPROCKET_PICKUP_LOCATION,
        'billing_customer_name': addr.get('first_name', 'Customer') + ' ' + addr.get('last_name', ''),
        'billing_last_name': addr.get('last_name', ''),
        'billing_address': addr.get('address1', addr.get('street', 'Address')),
        'billing_address_2': addr.get('address2', ''),
        'billing_city': addr.get('city', 'New Delhi'),
        'billing_pincode': addr.get('pincode', addr.get('zip', '110001')),
        'billing_state': addr.get('state', 'Delhi'),
        'billing_country': addr.get('country', 'India'),
        'billing_email': order.user.email if order.user else addr.get('email', 'customer@perfumebooth.com'),
        'billing_phone': addr.get('phone', '9999999999'),
        'shipping_is_billing': True,
        'order_items': shipment_items,
        'payment_method': 'COD' if order.payment_method == order.PaymentMethod.COD else 'Prepaid',
        'sub_total': float(order.subtotal),
        'length': 15,
        'width': 10,
        'height': 10,
        'weight': max(0.5, round(total_weight, 2))
    }

    try:
        res = requests.post(
            f"{SHIPROCKET_BASE_URL}/orders/create/adhoc",
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            json=payload,
            timeout=15
        )

        if res.status_code in [200, 201]:
            data = res.json()
            shipment = order.shipments.filter(provider='shiprocket').first()
            if shipment is None:
                shipment = Shipment(order=order, provider='shiprocket')
            shipment.provider_order_id = str(data.get('order_id', ''))
            shipment.provider_shipment_id = str(data.get('shipment_id', ''))
            shipment.status = Shipment.Status.PENDING
            shipment.save()
            return {
                'success': True,
                'shiprocket_order_id': shipment.provider_order_id,
                'shiprocket_shipment_id': shipment.provider_shipment_id
            }
        else:
            logger.error(f"Shiprocket order creation failed: {res.status_code} - {res.text}")
            return {'success': False, 'error': res.text}
    except Exception as e:
        logger.error(f"Shiprocket order creation exception: {e}")
        return {'success': False, 'error': str(e)}


def get_shiprocket_tracking(awb_code: str) -> dict:
    """
    Fetches real-time tracking events for an AWB code.
    """
    token = get_shiprocket_token()
    if not token:
        return {'success': False, 'error': 'Auth token missing'}

    try:
        res = requests.get(
            f"{SHIPROCKET_BASE_URL}/courier/track/awb/{awb_code}",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        if res.status_code == 200:
            return {'success': True, 'data': res.json()}
    except Exception as e:
        logger.error(f"Shiprocket tracking error: {e}")

    return {'success': False, 'error': 'Failed to fetch tracking data'}
