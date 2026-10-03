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
from .models import Order, OrderItem, Shipment, AbandonedCart
from apps.shop.models import Product, ProductVariant, Inventory
from apps.authentication.views import HasRolePermission
from apps.authentication.helpers import log_action
from core.throttling import CheckoutRateThrottle
from apps.checkout.validators import validate_checkout_request
from apps.checkout.services.checkout_service import CheckoutService

logger = logging.getLogger(__name__)


class CouponValidationView(APIView):
    """Validate a coupon and calculate its server-authoritative discount."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            subtotal = float(request.data.get('subtotal', 0))
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid subtotal.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(calculate_coupon(request.data.get('code', ''), subtotal))


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
        is_merchant = any(
            role in ['Super Admin', 'Admin', 'E-commerce Executive'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )

        orders_query = Order.objects.prefetch_related('items', 'shipments').all()
        if not is_merchant:
            orders_query = orders_query.filter(user=request.user)

        data = []
        for order in orders_query:
            item_qty = sum(item.quantity for item in order.items.all())
            
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

            data.append({
                'id': str(order.id),
                'order_number': order.order_number,
                'status': order.status,
                'total': str(order.total),
                'created_at': order.created_at,
                'customer_name': order.user.full_name if order.user else 'N/A',
                'customer_email': order.customer_email or (order.user.email if order.user else 'N/A'),
                'customer_phone': order.customer_phone,
                'payment_status': order.payment_status,
                'fulfillment_status': fulfillment_status,
                'item_quantity': item_qty,
                'delivery_method': latest_shipment.courier_name if latest_shipment and latest_shipment.courier_name else delivery_method,
                'payment_method': order.payment_method,
                'currency': order.currency,
            })
            
        return Response(data)

    def post(self, request):
        clean_input = validate_checkout_request(request.data)
        result = CheckoutService.process_checkout(request.user if request.user.is_authenticated else None, clean_input)
        return Response({
            'success': True,
            'order_id': result['order_id'],
            'order_number': result['order_number'],
            'total': result['total']
        }, status=status.HTTP_201_CREATED)



class OrderDetailView(APIView):
    """GET, PUT /api/orders/<id>/ — Detailed order access & status/tracking updates."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk: str):
        try:
            order = Order.objects.prefetch_related('items__product', 'items__variant', 'shipments').get(id=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_merchant = any(
            role in ['Super Admin', 'Admin', 'E-commerce Executive'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )
        if not is_merchant and order.user != request.user:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        items_data = []
        for item in order.items.all():
            prod_img = None
            if item.product:
                if item.product.image:
                    try:
                        prod_img = item.product.image.url
                    except Exception:
                        prod_img = str(item.product.image)
                elif hasattr(item.product, 'images'):
                    first_img_obj = item.product.images.first()
                    if first_img_obj and first_img_obj.image:
                        try:
                            prod_img = first_img_obj.image.url
                        except Exception:
                            prod_img = str(first_img_obj.image)

            items_data.append({
                'id': str(item.id),
                'product_id': str(item.product.id) if item.product else None,
                'product_slug': item.product.slug if item.product else None,
                'product_image': prod_img,
                'product_title': item.product_title or (item.product.title if item.product else 'Deleted Product'),
                'variant_id': str(item.variant_id) if item.variant_id else None,
                'variant_title': item.variant_title,
                'sku': item.sku or (item.product.sku if item.product else 'N/A'),
                'quantity': item.quantity,
                'unit_price': str(item.unit_price),
                'line_total': str(item.line_total),
            })

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

        return Response({
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
            'customer_name': order.user.full_name if order.user else 'N/A',
            'shipments': shipments,
        })

    def put(self, request, pk: str):
        is_merchant = any(
            role in ['Super Admin', 'Admin', 'E-commerce Executive'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )
        if not is_merchant:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        status_val = request.data.get('status')
        if status_val:
            if status_val not in Order.Status.values:
                return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
            order.status = status_val
            if status_val == Order.Status.REFUNDED:
                order.payment_status = Order.PaymentStatus.REFUNDED
            elif status_val == Order.Status.CANCELLED and order.payment_status == Order.PaymentStatus.PENDING:
                order.payment_status = Order.PaymentStatus.CANCELLED

        tracking_number = request.data.get('tracking_number')
        carrier = request.data.get('shipping_carrier')
        if tracking_number is not None or carrier is not None:
            addr = dict(order.shipping_address)
            if tracking_number is not None:
                addr['tracking_number'] = tracking_number
            if carrier is not None:
                addr['shipping_carrier'] = carrier
            order.shipping_address = addr

        order.save()
        log_action(request.user, f"Updated Order #{order.order_number} (Status: {order.status})", request)
        return Response({'detail': 'Order updated successfully.'})


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
        except json.JSONDecodeError:
            return Response({'detail': 'Invalid JSON.'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event.get('event')
        if event_type != 'payment.captured':
            return Response({'detail': 'Event not handled.'}, status=status.HTTP_200_OK)

        payment_intent_id = event['payload']['payment']['entity']['id']
        order_id = event['payload']['payment']['entity'].get('notes', {}).get('order_id')

        if not order_id:
            return Response({'detail': 'Missing order_id in notes.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = process_payment_webhook(payment_intent_id, order_id)
        except RuntimeError:
            return Response({'detail': 'Already processed.'}, status=status.HTTP_200_OK)
        except ValueError as e:
            logger.warning("Razorpay webhook order lookup failed: %s", e)
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        send_order_email_receipt.apply_async(
            args=[str(order.id)], queue='emails'
        )

        return Response({'detail': 'OK'}, status=status.HTTP_200_OK)


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
