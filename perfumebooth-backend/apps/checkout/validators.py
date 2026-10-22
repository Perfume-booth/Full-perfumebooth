"""
Checkout Request Validators
Ensures request structure is valid before passing to the checkout domain service.
"""
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
import re
import uuid
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from .exceptions import EmptyCartException, InvalidQuantityException


@dataclass
class CartItemInput:
    product_id: str
    quantity: int
    variant_id: Optional[str] = None


@dataclass
class CheckoutInput:
    items: List[CartItemInput]
    shipping_address: Dict[str, Any]
    payment_method: str
    coupon_code: str
    analytics_token: str = ''


def validate_checkout_request(data: dict) -> CheckoutInput:
    """
    Validate and extract clean checkout input.
    Rejects empty carts, zero/negative quantities, and invalid structures.
    Discards any client-supplied prices or discounts to guarantee backend authority.
    """
    if not isinstance(data, dict):
        raise ValidationError({"detail": "Invalid request body. Expected a JSON object."})

    items_raw = data.get('items')
    if not items_raw or not isinstance(items_raw, list):
        raise EmptyCartException()

    if len(items_raw) > 50:
        raise ValidationError({'items': ['A checkout may contain at most 50 cart lines.']})

    clean_items: List[CartItemInput] = []
    seen_lines = set()
    for idx, item in enumerate(items_raw):
        if not isinstance(item, dict):
            raise ValidationError({"items": [f"Item at position {idx} must be an object."]})

        product_id = item.get('id') or item.get('product_id')
        if not product_id:
            raise ValidationError({"items": [f"Item at position {idx} is missing a product ID."]})

        try:
            product_id = str(uuid.UUID(str(product_id)))
        except (ValueError, TypeError, AttributeError):
            raise ValidationError({'items': [f'Item at position {idx} has an invalid product ID.']})

        raw_qty = item.get('quantity', 1)
        try:
            quantity = int(raw_qty)
        except (ValueError, TypeError):
            raise InvalidQuantityException(f"Invalid quantity '{raw_qty}' for item {product_id}.")

        if quantity < 1 or quantity > 100:
            if quantity > 100:
                raise InvalidQuantityException('Item quantity cannot exceed 100.')
            raise InvalidQuantityException()

        variant_id = item.get('variant_id') or None
        if variant_id:
            try:
                variant_id = str(uuid.UUID(str(variant_id)))
            except (ValueError, TypeError, AttributeError):
                raise ValidationError({'items': [f'Item at position {idx} has an invalid variant ID.']})

        line_key = (product_id, variant_id)
        if line_key in seen_lines:
            raise ValidationError({'items': [f'Duplicate cart line at position {idx}.']})
        seen_lines.add(line_key)

        clean_items.append(CartItemInput(
            product_id=product_id,
            quantity=quantity,
            variant_id=variant_id
        ))

    shipping_address = data.get('shipping_address') or {}
    if not isinstance(shipping_address, dict):
        raise ValidationError({'shipping_address': ['Shipping address must be an object.']})

    aliases = {
        'first_name': ('first_name', 'firstName'),
        'last_name': ('last_name', 'lastName'),
        'address1': ('address1', 'address'),
        'city': ('city',),
        'state': ('state',),
        'zip': ('zip', 'postal_code', 'pincode'),
        'country_code': ('country_code', 'countryCode', 'country'),
        'phone': ('phone',),
        'email': ('email',),
    }
    normalized_address = dict(shipping_address)
    missing_fields = []
    for canonical, field_aliases in aliases.items():
        value = next((shipping_address.get(key) for key in field_aliases if shipping_address.get(key)), None)
        if value is None or not str(value).strip():
            missing_fields.append(canonical)
        else:
            normalized_address[canonical] = str(value).strip()
    if missing_fields:
        raise ValidationError({'shipping_address': [f"Missing required fields: {', '.join(missing_fields)}."]})

    try:
        validate_email(normalized_address['email'])
    except DjangoValidationError:
        raise ValidationError({'shipping_address': ['Enter a valid email address.']})
    if not re.fullmatch(r'[0-9+() -]{7,20}', normalized_address['phone']):
        raise ValidationError({'shipping_address': ['Enter a valid phone number.']})
    if not re.fullmatch(r'[A-Za-z0-9 -]{3,12}', normalized_address['zip']):
        raise ValidationError({'shipping_address': ['Enter a valid postal code.']})

    payment_method = str(data.get('payment_method') or 'COD').strip().upper()
    if payment_method not in {'COD', 'RAZORPAY'}:
        raise ValidationError({'payment_method': ['Supported payment methods are COD and RAZORPAY.']})
    coupon_code = str(data.get('coupon_code') or '').strip().upper()

    return CheckoutInput(
        items=clean_items,
        shipping_address=normalized_address,
        payment_method=payment_method,
        coupon_code=coupon_code,
        analytics_token=str(data.get('analytics_token') or '')[:1000],
    )
