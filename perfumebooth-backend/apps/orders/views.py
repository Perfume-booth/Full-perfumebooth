"""
Orders Views — Checkout & Webhook Endpoints
"""
import json
import datetime
import logging
import random
import uuid
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import verify_razorpay_signature, process_payment_webhook, calculate_coupon
from .tasks import send_order_email_receipt
from .models import Order, OrderItem, Shipment, AbandonedCart, Coupon, CouponRedemption, Promotion
from apps.shop.models import Product, ProductVariant, Inventory
from apps.shop.views import format_media_url
from apps.authentication.views import HasRolePermission
from apps.authentication.helpers import log_action
from core.throttling import CheckoutRateThrottle
from apps.checkout.validators import validate_checkout_request
from apps.checkout.services.checkout_service import CheckoutService
from apps.inventory.services import InventoryReservationService

logger = logging.getLogger(__name__)


def check_is_merchant(user):
    """Checks whether the user has administrative/merchant permissions."""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return True
    if hasattr(user, 'roles'):
        return any(
            role in ['Super Admin', 'Admin', 'E-commerce Executive'] 
            for role in user.roles.values_list('role__name', flat=True)
        )
    return False


class CouponValidationView(APIView):
    """Validate a coupon and calculate its server-authoritative discount."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            subtotal = float(request.data.get('subtotal', 0))
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid subtotal.'}, status=status.HTTP_400_BAD_REQUEST)
        email = request.data.get('email')
        return Response(calculate_coupon(request.data.get('code', ''), subtotal, user=request.user, customer_email=email))


class OrderListView(APIView):
    """GET /api/orders/ — List orders. POST /api/orders/ — Create order."""
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_throttles(self):
        if self.request.method == 'POST':
            return [CheckoutRateThrottle()]
        return super().get_throttles()

    def get(self, request):
        is_merchant = check_is_merchant(request.user)

        orders_query = Order.objects.prefetch_related('items__product__images', 'items__variant', 'shipments').all()
        if not is_merchant:
            orders_query = orders_query.filter(user=request.user)

        data = []
        for order in orders_query:
            order_items = list(order.items.all())
            item_qty = sum(item.quantity for item in order_items)
            
            shipping = order.shipping_address or {}
            delivery_method = shipping.get('shipping_carrier', 'Standard Shipping')
            latest_shipment = order.shipments.first()
                
            fulfillment_status = "Unfulfilled"
            if order.status == 'Shipped':
                fulfillment_status = "Shipped"
            elif order.status == 'Delivered':
                fulfillment_status = "Delivered"
            elif order.status == 'Cancelled':
                fulfillment_status = "Cancelled"
            elif order.status == 'Processing':
                fulfillment_status = "Processing"

            cust_name = (
                order.user.full_name if (order.user and hasattr(order.user, 'full_name') and order.user.full_name)
                else (
                    f"{shipping.get('first_name', '')} {shipping.get('last_name', '')}".strip()
                    or (order.customer_email or (order.user.email if order.user else 'Guest Customer'))
                )
            )

            data.append({
                'id': str(order.id),
                'order_number': order.order_number,
                'status': order.status,
                'total': str(order.total),
                'created_at': order.created_at,
                'customer_name': cust_name,
                'customer_email': order.customer_email or (order.user.email if order.user else 'N/A'),
                'customer_phone': order.customer_phone,
                'payment_status': order.payment_status,
                'fulfillment_status': fulfillment_status,
                'item_quantity': item_qty,
                'delivery_method': latest_shipment.courier_name if latest_shipment and latest_shipment.courier_name else delivery_method,
                'payment_method': order.payment_method,
                'currency': order.currency,
                'items': [serialize_order_item(item, request=request) for item in order_items],
            })
            
        return Response(data)

    def post(self, request):
        clean_input = validate_checkout_request(request.data)
        result = CheckoutService.idempotent_checkout(request.user, clean_input, request.headers.get('Idempotency-Key'))
        return Response({
            'success': True,
            'order_id': result['order_id'],
            'order_number': result['order_number'],
            'total': result['total']
        }, status=status.HTTP_201_CREATED)



def serialize_order_item(item, request=None):
    """Serializes a single order item with resilient image and product resolution."""
    product = item.product
    variant = item.variant

    if not product and item.sku:
        try:
            variant_obj = ProductVariant.objects.select_related('product').filter(sku=item.sku).first()
            if variant_obj:
                variant = variant or variant_obj
                product = variant_obj.product
            else:
                product = Product.objects.filter(sku=item.sku).first()
        except Exception:
            pass

    prod_img = None
    if variant and getattr(variant, 'image', None):
        try:
            prod_img = variant.image.url
        except Exception:
            prod_img = str(variant.image)

    if not prod_img and product and getattr(product, 'image', None):
        try:
            prod_img = product.image.url
        except Exception:
            prod_img = str(product.image)

    if not prod_img and product and hasattr(product, 'images'):
        try:
            first_img_obj = product.images.first()
            if first_img_obj:
                if getattr(first_img_obj, 'image', None):
                    try:
                        prod_img = first_img_obj.image.url
                    except Exception:
                        prod_img = str(first_img_obj.image)
                elif getattr(first_img_obj, 'source_url', None):
                    prod_img = first_img_obj.source_url
        except Exception:
            pass

    formatted_img = format_media_url(prod_img, request=request) if prod_img else None

    try:
        line_total_val = str(item.line_total)
    except Exception:
        line_total_val = str(float(item.unit_price) * item.quantity)

    return {
        'id': str(item.id),
        'product_id': str(product.id) if product else (str(item.product_id) if hasattr(item, 'product_id') and item.product_id else None),
        'product_slug': product.slug if product else None,
        'product_image': formatted_img,
        'product_title': item.product_title or (product.title if product else 'Deleted Product'),
        'variant_id': str(variant.id) if variant else (str(item.variant_id) if item.variant_id else None),
        'variant_title': item.variant_title or (variant.title if variant else ''),
        'sku': item.sku or (product.sku if product else 'N/A'),
        'quantity': item.quantity,
        'unit_price': str(item.unit_price),
        'line_total': line_total_val,
    }


def serialize_order_detail(order, request=None):
    """Formats full order details for customer/admin/guest tracking."""
    items_data = [serialize_order_item(item, request=request) for item in order.items.all()]

    shipments = [{
        'id': str(shipment.id),
        'provider': shipment.provider,
        'provider_order_id': shipment.provider_order_id,
        'provider_shipment_id': shipment.provider_shipment_id,
        'awb_code': shipment.awb_code,
        'courier_name': shipment.courier_name,
        'tracking_url': shipment.tracking_url,
        'status': shipment.status,
        'shipped_at': shipment.shipped_at,
        'delivered_at': shipment.delivered_at,
    } for shipment in order.shipments.all()]

    shipping_info = order.shipping_address or {}
    first_shipment = shipments[0] if shipments else {}
    cust_name = (
        order.user.full_name if (order.user and hasattr(order.user, 'full_name') and order.user.full_name)
        else (
            f"{shipping_info.get('first_name', '')} {shipping_info.get('last_name', '')}".strip()
            or (order.customer_email or (order.user.email if order.user else 'Guest Customer'))
        )
    )

    return {
        'id': str(order.id),
        'order_number': order.order_number,
        'status': order.status,
        'subtotal': str(order.subtotal),
        'discount_amount': str(order.discount_amount),
        'shipping_amount': str(order.shipping_amount),
        'tax': str(order.tax_amount),
        'tax_amount': str(order.tax_amount),
        'total': str(order.total),
        'currency': order.currency,
        'payment_method': order.payment_method,
        'payment_status': order.payment_status,
        'shipping_address': order.shipping_address,
        'created_at': order.created_at,
        'items': items_data,
        'customer_email': order.customer_email or (order.user.email if order.user else 'N/A'),
        'customer_phone': order.customer_phone,
        'customer_name': cust_name,
        'shipments': shipments,
        'awb_code': first_shipment.get('awb_code'),
        'courier_name': first_shipment.get('courier_name'),
        'tracking_url': first_shipment.get('tracking_url'),
    }


class GuestOrderTrackView(APIView):
    """
    GET /api/orders/track/?order_id=...&email=...
    Allows non-authenticated guests and customers to track an order securely.
    Requires matching order identifier (UUID or order number) and verified email.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        order_query = (request.query_params.get('order_id') or request.query_params.get('order_number') or '').strip()
        email = (request.query_params.get('email') or '').strip().lower()

        if not order_query or not email:
            return Response(
                {'detail': 'Both order identifier and email are required for tracking.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        clean_id = order_query.lstrip('#')
        order = None

        try:
            parsed_uuid = uuid.UUID(clean_id)
            order = Order.objects.prefetch_related('items__product__images', 'items__variant', 'shipments').filter(id=parsed_uuid).first()
        except (ValueError, AttributeError):
            pass

        if not order:
            from django.db.models import Q
            order = Order.objects.prefetch_related('items__product__images', 'items__variant', 'shipments').filter(
                Q(order_number__iexact=order_query) |
                Q(order_number__iexact=clean_id) |
                Q(order_number__iexact=f"PB-{clean_id}") |
                Q(order_number__iexact=f"#{clean_id}")
            ).first()

        if not order:
            return Response(
                {'detail': 'Order not found or email does not match.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Enforce email verification to prevent order enumeration
        shipping_addr = order.shipping_address or {}
        candidate_emails = {
            (order.customer_email or '').strip().lower(),
            str(shipping_addr.get('email', '')).strip().lower(),
        }
        if order.user and order.user.email:
            candidate_emails.add(order.user.email.strip().lower())
        candidate_emails.discard('')

        if email not in candidate_emails:
            return Response(
                {'detail': 'Order not found or email does not match.'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(serialize_order_detail(order, request=request))


def resolve_order(pk_or_order_number):
    """Finds an order QuerySet by UUID or human-readable order number."""
    clean = str(pk_or_order_number).strip().lstrip('#')
    try:
        parsed_uuid = uuid.UUID(clean)
        res = Order.objects.filter(id=parsed_uuid)
        if res.exists():
            return res
    except (ValueError, AttributeError):
        pass
    from django.db.models import Q
    return Order.objects.filter(
        Q(order_number__iexact=pk_or_order_number) |
        Q(order_number__iexact=clean) |
        Q(order_number__iexact=f"PB-{clean}") |
        Q(order_number__iexact=f"#{clean}")
    )


class OrderDetailView(APIView):
    """GET, PUT /api/orders/<id>/ — Detailed order access & status/tracking updates."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk: str):
        order = resolve_order(pk).prefetch_related('items__product__images', 'items__variant', 'shipments').first()
        if not order:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_merchant = check_is_merchant(request.user)
        if not is_merchant and order.user != request.user:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(serialize_order_detail(order, request=request))

    def put(self, request, pk: str):
        is_merchant = check_is_merchant(request.user)
        if not is_merchant:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            with transaction.atomic():
                order = resolve_order(pk).select_for_update().first()
                if not order:
                    return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

                status_val = request.data.get('status')
                if status_val:
                    if status_val not in Order.Status.values:
                        return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
                    order.status = status_val
                    if status_val == Order.Status.REFUNDED:
                        InventoryReservationService.restore_order(order, reason='Order refunded by admin')
                        order.payment_status = Order.PaymentStatus.REFUNDED
                    elif status_val == Order.Status.CANCELLED:
                        InventoryReservationService.restore_order(order, reason='Order cancelled by admin')
                        if order.payment_status == Order.PaymentStatus.PAID:
                            order.payment_status = Order.PaymentStatus.REFUNDED
                        else:
                            order.payment_status = Order.PaymentStatus.CANCELLED

                payment_status_val = request.data.get('payment_status')
                if payment_status_val:
                    if payment_status_val not in Order.PaymentStatus.values:
                        return Response({'detail': 'Invalid payment status.'}, status=status.HTTP_400_BAD_REQUEST)
                    order.payment_status = payment_status_val
                    if payment_status_val == Order.PaymentStatus.REFUNDED and order.status != Order.Status.REFUNDED:
                        order.status = Order.Status.REFUNDED
                        InventoryReservationService.restore_order(order, reason='Order refunded by admin')

                tracking_number = request.data.get('tracking_number')
                carrier = request.data.get('shipping_carrier')
                if tracking_number is not None or carrier is not None:
                    addr = dict(order.shipping_address)
                    if tracking_number is not None:
                        addr['tracking_number'] = tracking_number
                    if carrier is not None:
                        addr['shipping_carrier'] = carrier
                    order.shipping_address = addr

                    shipment = order.shipments.first()
                    if shipment is None:
                        shipment = Shipment(order=order, provider=carrier or 'shiprocket')
                    if tracking_number:
                        shipment.awb_code = tracking_number
                        if shipment.status == Shipment.Status.PENDING:
                            shipment.status = Shipment.Status.AWB_ASSIGNED
                    if carrier:
                        shipment.courier_name = carrier
                    shipment.save()

                order.save()
        except Order.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        log_action(request.user, f"Updated Order #{order.order_number} (Status: {order.status})", request)
        return Response({'detail': 'Order updated successfully.'})


class OrderCancelView(APIView):
    """
    POST /api/v1/orders/<pk>/cancel/
    Allows customer (or merchant) to cancel an order before it has been shipped.
    Restores inventory and sets status to CANCELLED (and payment_status to REFUNDED/CANCELLED).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: str):
        is_merchant = check_is_merchant(request.user)
        try:
            with transaction.atomic():
                order = resolve_order(pk).select_for_update().first()
                if not order:
                    return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
                if not is_merchant and order.user != request.user:
                    return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

                if order.status in [Order.Status.SHIPPED, Order.Status.DELIVERED]:
                    return Response({'detail': 'Cannot cancel an order that has already shipped or been delivered.'}, status=status.HTTP_400_BAD_REQUEST)

                if order.status == Order.Status.CANCELLED:
                    return Response({'detail': 'Order is already cancelled.'}, status=status.HTTP_200_OK)

                reason = request.data.get('reason', 'Cancelled by customer' if not is_merchant else 'Cancelled by admin')
                InventoryReservationService.restore_order(order, reason=reason)

                order.status = Order.Status.CANCELLED
                if order.payment_status == Order.PaymentStatus.PAID:
                    order.payment_status = Order.PaymentStatus.REFUNDED
                else:
                    order.payment_status = Order.PaymentStatus.CANCELLED

                order.save(update_fields=['status', 'payment_status', 'updated_at'])

                # Cancel any pending shipment
                order.shipments.filter(status__in=[Shipment.Status.PENDING, Shipment.Status.AWB_ASSIGNED]).update(status=Shipment.Status.CANCELLED)

                # Flag any pending outbox items
                from .models import PaymentOutbox
                PaymentOutbox.objects.filter(order=order, status='pending').update(status='review', last_error='Order cancelled before dispatch')

        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        log_action(request.user, f"Cancelled Order #{order.order_number}", request)
        return Response({'success': True, 'detail': 'Order cancelled successfully.', 'order_id': str(order.id), 'status': order.status})


class RazorpayWebhookView(APIView):
    """
    POST /api/orders/webhooks/razorpay/
    Receives Razorpay payment events.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        payload_body = request.body
        signature = request.headers.get('X-Razorpay-Signature', '')

        if not verify_razorpay_signature(payload_body, signature):
            return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = json.loads(payload_body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response({'detail': 'Invalid JSON.'}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(event, dict):
            return Response({'detail': 'Invalid event.'}, status=400)
        event_type = event.get('event')
        if event_type == 'refund.processed':
            from .payment_ledger import record_refund
            try:
                refund = event['payload']['refund']['entity']
            except (KeyError, TypeError):
                return Response({'detail': 'Malformed refund event.'}, status=400)
            record_refund(refund, event.get('created_at'))
            return Response({'detail': 'OK'}, status=200)
        if event_type not in {'payment.captured', 'payment.failed', 'payment.authorized'}:
            return Response({'detail': 'Event not handled.'}, status=status.HTTP_200_OK)

        try:
            entity = event['payload']['payment']['entity']
        except (KeyError, TypeError):
            return Response({'detail': 'Malformed payment event.'}, status=400)
        import hashlib
        from .payments import process_entity
        event_id = request.headers.get('X-Razorpay-Event-Id') or hashlib.sha256(payload_body).hexdigest()
        if len(event_id) > 200:
            return Response({'detail': 'Invalid event identifier.'}, status=400)
        process_entity(entity, 'webhook:' + event_id, event_type)

        return Response({'detail': 'OK'}, status=status.HTTP_200_OK)


class PaymentInitializeView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [CheckoutRateThrottle]

    def post(self, request):
        from .payments import initialize
        return Response(initialize(request.user, validate_checkout_request(request.data), request.headers.get('Idempotency-Key')))


class PaymentVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    # The signed gateway proof is the capability; an expired customer login
    # must not prevent payment reconciliation after money has been captured.
    authentication_classes = []
    throttle_classes = [CheckoutRateThrottle]

    def post(self, request):
        from .payments import verify
        result = verify(request.data)
        return Response(result, status=200 if result['success'] else 202)


class ShippingRatesAPIView(APIView):
    """
    POST /api/orders/shipping-rates/
    Calculates live courier rates & serviceability based on pincode & weight.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        pincode = request.data.get('pincode', '').strip()
        weight = float(request.data.get('weight', 0.5))
        is_cod = bool(request.data.get('cod', False))

        if not pincode:
            return Response({'detail': 'Pincode is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from .shiprocket import check_serviceability
        res = check_serviceability(delivery_postcode=pincode, weight=weight, is_cod=is_cod)
        return Response(res, status=status.HTTP_200_OK)


class ShiprocketWebhookView(APIView):
    """
    POST /api/orders/shiprocket/webhook/
    Receives order status updates (AWB_ASSIGNED, SHIPPED, DELIVERED) from Shiprocket.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        import hmac
        from django.conf import settings
        expected_token = getattr(settings, 'SHIPROCKET_WEBHOOK_TOKEN', '')
        provided_token = (
            request.headers.get('x-api-key') or 
            request.headers.get('X-Shiprocket-Token') or 
            request.headers.get('Authorization', '').replace('Bearer ', '').strip()
        )

        if not expected_token or not provided_token or not hmac.compare_digest(expected_token, provided_token):
            return Response({'detail': 'Unauthorized webhook request.'}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        order_number = data.get('order_id')
        current_status = data.get('current_status', '').upper()
        awb_code = data.get('awb', data.get('awb_code'))
        courier_name = data.get('courier_name')
        tracking_url = data.get('tracking_url')

        if not order_number:
            return Response({'detail': 'Missing order_id'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({'detail': f'Order #{order_number} not found.'}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone

        shipment = order.shipments.filter(provider='shiprocket').first()
        if shipment is None:
            shipment = Shipment(order=order, provider='shiprocket', provider_order_id=str(order_number))
        if awb_code:
            shipment.awb_code = awb_code
        if courier_name:
            shipment.courier_name = courier_name
        if tracking_url:
            shipment.tracking_url = tracking_url
        if data.get('shipment_id'):
            shipment.provider_shipment_id = str(data['shipment_id'])

        if current_status in ['SHIPPED', 'IN TRANSIT', 'OUT FOR DELIVERY'] and order.status != Order.Status.SHIPPED:
            order.status = Order.Status.SHIPPED
            shipment.status = {
                'SHIPPED': Shipment.Status.SHIPPED,
                'IN TRANSIT': Shipment.Status.IN_TRANSIT,
                'OUT FOR DELIVERY': Shipment.Status.OUT_FOR_DELIVERY,
            }[current_status]
            shipment.shipped_at = shipment.shipped_at or timezone.now()
            shipment.save()
            order.save()

            # Trigger transactional dispatch email
            from .tasks import send_shipping_dispatch_email
            send_shipping_dispatch_email.delay(str(order.id))

        elif current_status in ['DELIVERED'] and order.status != Order.Status.DELIVERED:
            order.status = Order.Status.DELIVERED
            shipment.status = Shipment.Status.DELIVERED
            shipment.delivered_at = shipment.delivered_at or timezone.now()
            shipment.save()
            if order.payment_method == Order.PaymentMethod.COD:
                order.payment_status = Order.PaymentStatus.PAID
            order.save()

        else:
            shipment_statuses = {
                'AWB ASSIGNED': Shipment.Status.AWB_ASSIGNED,
                'IN TRANSIT': Shipment.Status.IN_TRANSIT,
                'OUT FOR DELIVERY': Shipment.Status.OUT_FOR_DELIVERY,
                'CANCELLED': Shipment.Status.CANCELLED,
            }
            if current_status in shipment_statuses:
                shipment.status = shipment_statuses[current_status]
            shipment.save()
            order.save()

        return Response({'detail': 'Webhook processed.'}, status=status.HTTP_200_OK)


class AbandonedCartAPIView(APIView):
    """
    POST /api/orders/abandoned-cart/
    Captures checkout cart state for automated recovery.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        cart_data = request.data.get('cart_data')

        if not email or not cart_data:
            return Response({'detail': 'Email and cart_data are required.'}, status=status.HTTP_400_BAD_REQUEST)

        token = uuid.uuid4().hex
        user_inst = request.user if request.user.is_authenticated else None

        cart, _ = AbandonedCart.objects.update_or_create(
            email=email,
            recovered=False,
            defaults={
                'user': user_inst,
                'cart_data': cart_data,
                'token': token,
            }
        )

        return Response({
            'detail': 'Cart saved for recovery.',
            'token': cart.token,
            'id': str(cart.id)
        }, status=status.HTTP_200_OK)


class AbandonedCartRecoverView(APIView):
    """
    GET /api/orders/abandoned-cart/recover/<token>/
    Restores abandoned cart by token and marks it recovered.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            cart = AbandonedCart.objects.get(token=token, recovered=False)
            cart.recovered = True
            cart.save()
            return Response({
                'detail': 'Cart recovered successfully.',
                'cart_data': cart.cart_data
            })
        except AbandonedCart.DoesNotExist:
            return Response({'detail': 'Invalid or expired cart recovery token.'}, status=status.HTTP_404_NOT_FOUND)


class MerchantCouponListView(APIView):
    """
    GET /api/orders/merchant/coupons/ — List all coupons with stats.
    POST /api/orders/merchant/coupons/ — Create a new coupon.
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        search_q = request.query_params.get('q', '').strip()
        status_filter = request.query_params.get('status', '').strip()

        coupons_qs = Coupon.objects.all().order_by('-created_at')

        if search_q:
            coupons_qs = coupons_qs.filter(code__icontains=search_q)

        if status_filter == 'active':
            coupons_qs = coupons_qs.filter(is_active=True)
        elif status_filter == 'inactive':
            coupons_qs = coupons_qs.filter(is_active=False)

        coupons_data = []
        for c in coupons_qs:
            coupons_data.append({
                'id': str(c.id),
                'code': c.code,
                'description': c.description,
                'discount_type': c.discount_type,
                'discount_value': str(c.discount_value),
                'min_order_value': str(c.min_order_value),
                'max_discount': str(c.max_discount) if c.max_discount else None,
                'start_date': c.start_date.isoformat() if c.start_date else None,
                'end_date': c.end_date.isoformat() if c.end_date else None,
                'usage_limit': c.usage_limit,
                'times_used': c.times_used,
                'per_customer_limit': c.per_customer_limit,
                'product_restrictions': c.product_restrictions or [],
                'category_restrictions': c.category_restrictions or [],
                'customer_restrictions': c.customer_restrictions or [],
                'is_active': c.is_active,
                'first_order_only': c.first_order_only,
                'created_at': c.created_at.isoformat(),
            })

        total_coupons = len(coupons_data)
        active_coupons = sum(1 for c in coupons_data if c['is_active'])
        total_redemptions = sum(c['times_used'] for c in coupons_data)

        return Response({
            'metrics': {
                'total_coupons': total_coupons,
                'active_coupons': active_coupons,
                'total_redemptions': total_redemptions,
            },
            'coupons': coupons_data
        })

    def post(self, request):
        code = str(request.data.get('code', '')).strip().upper()
        if not code:
            return Response({'detail': 'Coupon code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if Coupon.objects.filter(code=code).exists():
            return Response({'detail': f'Coupon code "{code}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        discount_type = request.data.get('discount_type', 'percentage')
        if discount_type not in ['percentage', 'fixed', 'free_shipping']:
            return Response({'detail': 'Invalid discount type.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            discount_value = float(request.data.get('discount_value', 0))
        except (ValueError, TypeError):
            discount_value = 0.0

        try:
            min_order_value = float(request.data.get('min_order_value', 0))
        except (ValueError, TypeError):
            min_order_value = 0.0

        max_discount = request.data.get('max_discount')
        if max_discount is not None and max_discount != '':
            try:
                max_discount = float(max_discount)
            except (ValueError, TypeError):
                max_discount = None
        else:
            max_discount = None

        usage_limit = request.data.get('usage_limit')
        if usage_limit is not None and usage_limit != '':
            try:
                usage_limit = int(usage_limit)
            except (ValueError, TypeError):
                usage_limit = None
        else:
            usage_limit = None

        per_customer_limit = request.data.get('per_customer_limit')
        if per_customer_limit is not None and per_customer_limit != '':
            try:
                per_customer_limit = int(per_customer_limit)
            except (ValueError, TypeError):
                per_customer_limit = None
        else:
            per_customer_limit = None

        coupon = Coupon.objects.create(
            code=code,
            description=request.data.get('description', '').strip(),
            discount_type=discount_type,
            discount_value=discount_value,
            min_order_value=min_order_value,
            max_discount=max_discount,
            start_date=request.data.get('start_date') or None,
            end_date=request.data.get('end_date') or None,
            usage_limit=usage_limit,
            per_customer_limit=per_customer_limit,
            product_restrictions=request.data.get('product_restrictions') or [],
            category_restrictions=request.data.get('category_restrictions') or [],
            customer_restrictions=request.data.get('customer_restrictions') or [],
            first_order_only=bool(request.data.get('first_order_only', False)),
            is_active=bool(request.data.get('is_active', True))
        )

        log_action(request.user, f"Created coupon code: {coupon.code}", request)

        return Response({
            'id': str(coupon.id),
            'code': coupon.code,
            'detail': 'Coupon created successfully.'
        }, status=status.HTTP_201_CREATED)


class MerchantCouponDetailView(APIView):
    """
    GET, PUT, DELETE /api/orders/merchant/coupons/<uuid:pk>/
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request, pk):
        try:
            c = Coupon.objects.get(id=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'id': str(c.id),
            'code': c.code,
            'description': c.description,
            'discount_type': c.discount_type,
            'discount_value': str(c.discount_value),
            'min_order_value': str(c.min_order_value),
            'max_discount': str(c.max_discount) if c.max_discount else None,
            'start_date': c.start_date.isoformat() if c.start_date else None,
            'end_date': c.end_date.isoformat() if c.end_date else None,
            'usage_limit': c.usage_limit,
            'times_used': c.times_used,
            'per_customer_limit': c.per_customer_limit,
            'product_restrictions': c.product_restrictions or [],
            'category_restrictions': c.category_restrictions or [],
            'customer_restrictions': c.customer_restrictions or [],
            'is_active': c.is_active,
            'first_order_only': c.first_order_only,
            'created_at': c.created_at.isoformat(),
        })

    def put(self, request, pk):
        try:
            coupon = Coupon.objects.get(id=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)

        code = request.data.get('code')
        if code:
            code = code.strip().upper()
            if Coupon.objects.filter(code=code).exclude(id=coupon.id).exists():
                return Response({'detail': f'Coupon code "{code}" already in use.'}, status=status.HTTP_400_BAD_REQUEST)
            coupon.code = code

        if 'description' in request.data:
            coupon.description = request.data.get('description', '').strip()
        if 'discount_type' in request.data:
            coupon.discount_type = request.data.get('discount_type')
        if 'discount_value' in request.data:
            coupon.discount_value = float(request.data.get('discount_value', 0))
        if 'min_order_value' in request.data:
            coupon.min_order_value = float(request.data.get('min_order_value', 0))
        if 'max_discount' in request.data:
            max_d = request.data.get('max_discount')
            coupon.max_discount = float(max_d) if max_d not in [None, ''] else None
        if 'start_date' in request.data:
            coupon.start_date = request.data.get('start_date') or None
        if 'end_date' in request.data:
            coupon.end_date = request.data.get('end_date') or None
        if 'usage_limit' in request.data:
            u_lim = request.data.get('usage_limit')
            coupon.usage_limit = int(u_lim) if u_lim not in [None, ''] else None
        if 'per_customer_limit' in request.data:
            pcl = request.data.get('per_customer_limit')
            coupon.per_customer_limit = int(pcl) if pcl not in [None, ''] else None
        if 'product_restrictions' in request.data:
            coupon.product_restrictions = request.data.get('product_restrictions') or []
        if 'category_restrictions' in request.data:
            coupon.category_restrictions = request.data.get('category_restrictions') or []
        if 'customer_restrictions' in request.data:
            coupon.customer_restrictions = request.data.get('customer_restrictions') or []
        if 'first_order_only' in request.data:
            coupon.first_order_only = bool(request.data.get('first_order_only'))
        if 'is_active' in request.data:
            coupon.is_active = bool(request.data.get('is_active'))

        coupon.save()
        log_action(request.user, f"Updated coupon code: {coupon.code}", request)
        return Response({'detail': 'Coupon updated successfully.'})

    def delete(self, request, pk):
        try:
            coupon = Coupon.objects.get(id=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)

        code = coupon.code
        coupon.delete()
        log_action(request.user, f"Deleted coupon code: {code}", request)
        return Response({'detail': f'Coupon "{code}" deleted successfully.'})


class MerchantCouponToggleStatusView(APIView):
    """
    POST /api/orders/merchant/coupons/<uuid:pk>/toggle/
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def post(self, request, pk):
        try:
            coupon = Coupon.objects.get(id=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)

        coupon.is_active = not coupon.is_active
        coupon.save(update_fields=['is_active'])

        state = "activated" if coupon.is_active else "deactivated"
        log_action(request.user, f"{state.capitalize()} coupon code: {coupon.code}", request)

        return Response({
            'id': str(coupon.id),
            'is_active': coupon.is_active,
            'detail': f'Coupon "{coupon.code}" {state}.'
        })


class MerchantCouponBulkGenerateView(APIView):
    """
    POST /api/orders/merchant/coupons/bulk-generate/
    Generates batches of unique promo/referral coupon codes with custom prefix.
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def post(self, request):
        import secrets
        prefix = str(request.data.get('prefix', 'PROMO')).strip().upper()
        try:
            count = int(request.data.get('count', 10))
            count = max(1, min(count, 500))
        except (ValueError, TypeError):
            count = 10

        discount_type = request.data.get('discount_type', 'percentage')
        try:
            discount_value = float(request.data.get('discount_value', 10))
        except (ValueError, TypeError):
            discount_value = 10.0

        try:
            min_order_value = float(request.data.get('min_order_value', 0))
        except (ValueError, TypeError):
            min_order_value = 0.0

        max_discount = request.data.get('max_discount')
        max_discount = float(max_discount) if max_discount not in [None, ''] else None

        usage_limit = request.data.get('usage_limit', 1)
        usage_limit = int(usage_limit) if usage_limit not in [None, ''] else None

        per_customer_limit = request.data.get('per_customer_limit', 1)
        per_customer_limit = int(per_customer_limit) if per_customer_limit not in [None, ''] else None

        start_date = request.data.get('start_date') or None
        end_date = request.data.get('end_date') or None
        first_order_only = bool(request.data.get('first_order_only', False))
        product_restrictions = request.data.get('product_restrictions') or []
        category_restrictions = request.data.get('category_restrictions') or []
        customer_restrictions = request.data.get('customer_restrictions') or []

        created_coupons = []
        existing_codes = set(Coupon.objects.values_list('code', flat=True))
        attempts = 0

        while len(created_coupons) < count and attempts < count * 20:
            attempts += 1
            rand_suffix = secrets.token_hex(3).upper()
            candidate = f"{prefix}-{rand_suffix}" if prefix else rand_suffix
            if candidate in existing_codes:
                continue
            existing_codes.add(candidate)
            created_coupons.append(
                Coupon(
                    code=candidate,
                    description=request.data.get('description', f'Bulk generated code ({prefix})').strip(),
                    discount_type=discount_type,
                    discount_value=discount_value,
                    min_order_value=min_order_value,
                    max_discount=max_discount,
                    start_date=start_date,
                    end_date=end_date,
                    usage_limit=usage_limit,
                    per_customer_limit=per_customer_limit,
                    first_order_only=first_order_only,
                    product_restrictions=product_restrictions,
                    category_restrictions=category_restrictions,
                    customer_restrictions=customer_restrictions,
                    is_active=True
                )
            )

        Coupon.objects.bulk_create(created_coupons)
        log_action(request.user, f"Bulk generated {len(created_coupons)} coupons with prefix {prefix}", request)

        return Response({
            'detail': f'Successfully generated {len(created_coupons)} coupon codes.',
            'count': len(created_coupons),
            'sample_codes': [c.code for c in created_coupons[:10]],
            'codes': [c.code for c in created_coupons],
        }, status=status.HTTP_201_CREATED)


class MerchantPromotionListView(APIView):
    """
    GET /api/orders/merchant/promotions/ — List all promotions with stats.
    POST /api/orders/merchant/promotions/ — Create a new promotion.
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        from django.db.models import Q
        search_q = request.query_params.get('q', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        target_filter = request.query_params.get('target', '').strip()

        qs = Promotion.objects.all().order_by('-priority', '-created_at')
        if search_q:
            qs = qs.filter(Q(name__icontains=search_q) | Q(description__icontains=search_q))
        if status_filter == 'active':
            qs = qs.filter(is_active=True)
        elif status_filter == 'inactive':
            qs = qs.filter(is_active=False)
        if target_filter:
            qs = qs.filter(target_type=target_filter)

        promo_list = []
        for p in qs:
            promo_list.append({
                'id': str(p.id),
                'name': p.name,
                'description': p.description,
                'discount_type': p.discount_type,
                'discount_value': str(p.discount_value),
                'target_type': p.target_type,
                'target_values': p.target_values or [],
                'min_order_value': str(p.min_order_value),
                'max_discount': str(p.max_discount) if p.max_discount else None,
                'start_date': p.start_date.isoformat() if p.start_date else None,
                'end_date': p.end_date.isoformat() if p.end_date else None,
                'priority': p.priority,
                'is_active': p.is_active,
                'is_flash_sale': p.is_flash_sale,
                'combination_rule': p.combination_rule,
                'created_at': p.created_at.isoformat(),
            })

        metrics = {
            'total_promotions': len(promo_list),
            'active_promotions': sum(1 for p in promo_list if p['is_active']),
            'flash_sales': sum(1 for p in promo_list if p['is_flash_sale'] and p['is_active']),
        }
        return Response({'metrics': metrics, 'promotions': promo_list})

    def post(self, request):
        name = str(request.data.get('name', '')).strip()
        if not name:
            return Response({'detail': 'Promotion name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        discount_type = request.data.get('discount_type', 'percentage')
        try:
            discount_value = float(request.data.get('discount_value', 0))
        except (ValueError, TypeError):
            discount_value = 0.0

        try:
            min_order_value = float(request.data.get('min_order_value', 0))
        except (ValueError, TypeError):
            min_order_value = 0.0

        max_discount = request.data.get('max_discount')
        max_discount = float(max_discount) if max_discount not in [None, ''] else None

        try:
            priority = int(request.data.get('priority', 0))
        except (ValueError, TypeError):
            priority = 0

        target_type = request.data.get('target_type', 'all')
        target_values = request.data.get('target_values') or []
        combination_rule = request.data.get('combination_rule', 'stackable')

        promotion = Promotion.objects.create(
            name=name,
            description=request.data.get('description', '').strip(),
            discount_type=discount_type,
            discount_value=discount_value,
            target_type=target_type,
            target_values=target_values,
            min_order_value=min_order_value,
            max_discount=max_discount,
            start_date=request.data.get('start_date') or None,
            end_date=request.data.get('end_date') or None,
            priority=priority,
            is_active=bool(request.data.get('is_active', True)),
            is_flash_sale=bool(request.data.get('is_flash_sale', False)),
            combination_rule=combination_rule,
        )

        log_action(request.user, f"Created promotion: {promotion.name}", request)
        return Response({
            'id': str(promotion.id),
            'name': promotion.name,
            'detail': 'Promotion created successfully.'
        }, status=status.HTTP_201_CREATED)


class MerchantPromotionDetailView(APIView):
    """
    GET, PUT, DELETE /api/orders/merchant/promotions/<uuid:pk>/
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request, pk):
        try:
            p = Promotion.objects.get(id=pk)
        except Promotion.DoesNotExist:
            return Response({'detail': 'Promotion not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'id': str(p.id),
            'name': p.name,
            'description': p.description,
            'discount_type': p.discount_type,
            'discount_value': str(p.discount_value),
            'target_type': p.target_type,
            'target_values': p.target_values or [],
            'min_order_value': str(p.min_order_value),
            'max_discount': str(p.max_discount) if p.max_discount else None,
            'start_date': p.start_date.isoformat() if p.start_date else None,
            'end_date': p.end_date.isoformat() if p.end_date else None,
            'priority': p.priority,
            'is_active': p.is_active,
            'is_flash_sale': p.is_flash_sale,
            'combination_rule': p.combination_rule,
            'created_at': p.created_at.isoformat(),
        })

    def put(self, request, pk):
        try:
            p = Promotion.objects.get(id=pk)
        except Promotion.DoesNotExist:
            return Response({'detail': 'Promotion not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            p.name = str(request.data.get('name', '')).strip()
        if 'description' in request.data:
            p.description = str(request.data.get('description', '')).strip()
        if 'discount_type' in request.data:
            p.discount_type = request.data.get('discount_type')
        if 'discount_value' in request.data:
            p.discount_value = float(request.data.get('discount_value', 0))
        if 'target_type' in request.data:
            p.target_type = request.data.get('target_type')
        if 'target_values' in request.data:
            p.target_values = request.data.get('target_values') or []
        if 'min_order_value' in request.data:
            p.min_order_value = float(request.data.get('min_order_value', 0))
        if 'max_discount' in request.data:
            md = request.data.get('max_discount')
            p.max_discount = float(md) if md not in [None, ''] else None
        if 'start_date' in request.data:
            p.start_date = request.data.get('start_date') or None
        if 'end_date' in request.data:
            p.end_date = request.data.get('end_date') or None
        if 'priority' in request.data:
            p.priority = int(request.data.get('priority', 0))
        if 'is_active' in request.data:
            p.is_active = bool(request.data.get('is_active'))
        if 'is_flash_sale' in request.data:
            p.is_flash_sale = bool(request.data.get('is_flash_sale'))
        if 'combination_rule' in request.data:
            p.combination_rule = request.data.get('combination_rule')

        p.save()
        log_action(request.user, f"Updated promotion: {p.name}", request)
        return Response({'detail': 'Promotion updated successfully.'})

    def delete(self, request, pk):
        try:
            p = Promotion.objects.get(id=pk)
        except Promotion.DoesNotExist:
            return Response({'detail': 'Promotion not found.'}, status=status.HTTP_404_NOT_FOUND)

        name = p.name
        p.delete()
        log_action(request.user, f"Deleted promotion: {name}", request)
        return Response({'detail': f'Promotion "{name}" deleted successfully.'})


class MerchantPromotionToggleStatusView(APIView):
    """
    POST /api/orders/merchant/promotions/<uuid:pk>/toggle/
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def post(self, request, pk):
        try:
            p = Promotion.objects.get(id=pk)
        except Promotion.DoesNotExist:
            return Response({'detail': 'Promotion not found.'}, status=status.HTTP_404_NOT_FOUND)

        p.is_active = not p.is_active
        p.save(update_fields=['is_active'])

        state = "activated" if p.is_active else "deactivated"
        log_action(request.user, f"{state.capitalize()} promotion: {p.name}", request)
        return Response({
            'id': str(p.id),
            'is_active': p.is_active,
            'detail': f'Promotion "{p.name}" {state}.'
        })


class PublicActivePromotionsView(APIView):
    """
    GET /api/orders/promotions/active/
    Public endpoint providing active promotional campaigns, discounts, and flash sales for storefront display.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .promotions import PromotionService
        active_promos = PromotionService.get_active_promotions()

        data = [
            {
                'id': str(p.id),
                'name': p.name,
                'description': p.description,
                'discount_type': p.discount_type,
                'discount_value': float(p.discount_value),
                'target_type': p.target_type,
                'target_values': p.target_values or [],
                'min_order_value': float(p.min_order_value),
                'max_discount': float(p.max_discount) if p.max_discount else None,
                'start_date': p.start_date.isoformat() if p.start_date else None,
                'end_date': p.end_date.isoformat() if p.end_date else None,
                'is_flash_sale': p.is_flash_sale,
                'priority': p.priority,
                'combination_rule': p.combination_rule,
            }
            for p in active_promos
        ]
        return Response({'promotions': data})

