"""
Orders Views — Checkout & Webhook Endpoints
"""
import json
import datetime
import random
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import verify_razorpay_signature, process_payment_webhook
from .tasks import send_order_email_receipt
from .models import Order, OrderItem
from apps.shop.models import Product, Inventory
from apps.authentication.views import HasRolePermission
from apps.authentication.helpers import log_action


class OrderListView(APIView):
    """GET /api/orders/ — List orders. POST /api/orders/ — Create order."""
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get(self, request):
        is_merchant = any(
            role in ['Super Admin', 'Admin', 'E-commerce Executive'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )

        orders_query = Order.objects.prefetch_related('items').all()
        if not is_merchant:
            orders_query = orders_query.filter(user=request.user)

        data = []
        for order in orders_query:
            item_qty = sum(item.quantity for item in order.items.all())
            
            shipping = order.shipping_address or {}
            delivery_method = shipping.get('shipping_carrier', 'Standard Shipping')
            pay_method = shipping.get('payment_method', 'COD')

            payment_status = "Pending"
            if order.status in ['Paid', 'Shipped', 'Delivered']:
                payment_status = "Paid"
            elif order.status == 'Refunded':
                payment_status = "Refunded"
            elif order.status == 'Cancelled':
                payment_status = "Cancelled"
                
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
                'customer_email': order.user.email if order.user else 'N/A',
                'payment_status': payment_status,
                'fulfillment_status': fulfillment_status,
                'item_quantity': item_qty,
                'delivery_method': delivery_method,
                'payment_method': pay_method,
            })
            
        return Response(data)

    def post(self, request):
        items_data = request.data.get('items', [])
        shipping_address = request.data.get('shipping_address', {})
        payment_method = request.data.get('payment_method', 'COD')
        coupon_code = request.data.get('coupon_code', '')
        discount_amount_val = float(request.data.get('discount_amount', 0.0))

        if not items_data:
            return Response({'detail': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                subtotal = 0.0
                order_items_to_create = []
                inventory_updates = []

                for item in items_data:
                    product_id = item.get('id')
                    quantity = int(item.get('quantity', 1))

                    try:
                        product = Product.objects.get(id=product_id)
                    except Product.DoesNotExist:
                        return Response({'detail': f'Product {product_id} not found.'}, status=status.HTTP_404_NOT_FOUND)

                    try:
                        inventory = Inventory.objects.select_for_update().get(product=product)
                    except Inventory.DoesNotExist:
                        return Response({'detail': f'Inventory for product {product.title} not initialized.'}, status=status.HTTP_400_BAD_REQUEST)

                    if inventory.stock_level < quantity:
                        return Response({'detail': f'Insufficient stock for product {product.title}. Only {inventory.stock_level} available.'}, status=status.HTTP_400_BAD_REQUEST)

                    # Deduct stock level directly
                    inventory.stock_level -= quantity
                    inventory_updates.append(inventory)

                    line_price = float(product.price)
                    subtotal += line_price * quantity

                    order_items_to_create.append({
                        'product': product,
                        'quantity': quantity,
                        'unit_price': line_price
                    })

                discount_amount = min(discount_amount_val, subtotal)
                total = max(subtotal - discount_amount, 0.0)
                tax = 0.0

                timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
                rand = random.randint(1000, 9999)
                order_number = f'PB-{timestamp}-{rand}'

                order_user = request.user if request.user and request.user.is_authenticated else None

                # Inject payment method into shipping address JSON to save it without database schema changes
                if isinstance(shipping_address, dict):
                    shipping_address['payment_method'] = payment_method

                order = Order.objects.create(
                    user=order_user,
                    order_number=order_number,
                    status=Order.Status.PENDING,
                    subtotal=subtotal,
                    tax=tax,
                    total=total,
                    shipping_address=shipping_address
                )

                for item_data in order_items_to_create:
                    OrderItem.objects.create(
                        order=order,
                        product=item_data['product'],
                        quantity=item_data['quantity'],
                        unit_price=item_data['unit_price']
                    )

                for inv in inventory_updates:
                    inv.save()

                if payment_method == 'COD':
                    order.status = Order.Status.PROCESSING
                    order.save(update_fields=['status'])

                return Response({
                    'success': True,
                    'order_id': str(order.id),
                    'order_number': order.order_number,
                    'total': str(order.total)
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderDetailView(APIView):
    """GET, PUT /api/orders/<id>/ — Detailed order access & status/tracking updates."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk: str):
        try:
            order = Order.objects.prefetch_related('items__product').get(id=pk)
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
                'product_title': item.product.title if item.product else 'Deleted Product',
                'sku': item.product.sku if item.product else 'N/A',
                'quantity': item.quantity,
                'unit_price': str(item.unit_price),
                'line_total': str(item.line_total),
            })

        return Response({
            'id': str(order.id),
            'order_number': order.order_number,
            'status': order.status,
            'subtotal': str(order.subtotal),
            'tax': str(order.tax),
            'total': str(order.total),
            'shipping_address': order.shipping_address,
            'created_at': order.created_at,
            'items': items_data,
            'customer_email': order.user.email if order.user else 'N/A',
            'customer_name': order.user.full_name if order.user else 'N/A',
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
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

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

        if awb_code:
            order.awb_code = awb_code
        if courier_name:
            order.courier_name = courier_name
        if tracking_url:
            order.tracking_url = tracking_url

        if current_status in ['AWB ASSIGNED', 'SHIPPED', 'IN TRANSIT', 'OUT FOR DELIVERY'] and order.status != Order.Status.SHIPPED:
            order.status = Order.Status.SHIPPED
            order.shipped_at = timezone.now()
            order.save()

            # Trigger transactional dispatch email
            from .tasks import send_shipping_dispatch_email
            send_shipping_dispatch_email.delay(str(order.id))

        elif current_status in ['DELIVERED'] and order.status != Order.Status.DELIVERED:
            order.status = Order.Status.DELIVERED
            order.delivered_at = timezone.now()
            order.save()

        else:
            order.save()

        return Response({'detail': 'Webhook processed.'}, status=status.HTTP_200_OK)


