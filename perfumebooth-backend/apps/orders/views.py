"""
Orders Views — Checkout & Webhook Endpoints
"""
import json
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import verify_razorpay_signature, process_payment_webhook
from .tasks import send_order_email_receipt
from .models import Order
from apps.authentication.views import HasRolePermission
from apps.authentication.helpers import log_action


class OrderListView(APIView):
    """GET /api/orders/ — List orders for customers or all orders for merchants."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        is_merchant = any(
            role in ['Super Admin', 'Admin', 'E-commerce Executive'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )

        orders_query = Order.objects.all()
        if not is_merchant:
            orders_query = orders_query.filter(user=request.user)

        data = []
        for order in orders_query:
            data.append({
                'id': str(order.id),
                'order_number': order.order_number,
                'status': order.status,
                'total': str(order.total),
                'created_at': order.created_at,
                'customer_name': order.user.full_name if order.user else 'N/A',
                'customer_email': order.user.email if order.user else 'N/A',
            })
            
        return Response(data)


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
            items_data.append({
                'id': str(item.id),
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

