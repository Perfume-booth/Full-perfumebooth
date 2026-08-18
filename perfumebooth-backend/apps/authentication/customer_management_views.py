from django.db.models import Sum, Count, Q, Max
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CustomUser
from .views import HasRolePermission
from .helpers import log_action
from apps.orders.models import Order


class MerchantCustomerListView(APIView):
    """
    GET /api/auth/merchant/customers/
    POST /api/auth/merchant/customers/
    List customer directory with LTV, order counts, and create new customer manually.
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        search_q = request.query_params.get('q', '').strip()
        status_filter = request.query_params.get('status', '').strip()

        # Query customers (users who are not staff or superusers)
        customers_qs = CustomUser.objects.filter(is_staff=False)

        if search_q:
            customers_qs = customers_qs.filter(
                Q(email__icontains=search_q) |
                Q(phone__icontains=search_q) |
                Q(first_name__icontains=search_q) |
                Q(last_name__icontains=search_q)
            )

        if status_filter == 'active':
            customers_qs = customers_qs.filter(is_active=True)
        elif status_filter == 'disabled':
            customers_qs = customers_qs.filter(is_active=False)

        # Annotate with order statistics
        paid_statuses = ['Paid', 'Shipped', 'Delivered', 'Processing']

        customers_data = []
        for user in customers_qs.order_by('-date_joined'):
            user_orders = Order.objects.filter(user=user)
            total_orders = user_orders.count()

            paid_orders = user_orders.filter(status__in=paid_statuses)
            ltv_val = paid_orders.aggregate(total_sum=Sum('total'))['total_sum'] or 0.0
            last_order = user_orders.order_by('-created_at').first()

            customers_data.append({
                'id': str(user.id),
                'email': user.email or 'N/A',
                'phone': user.phone or 'N/A',
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.full_name or 'Guest Customer',
                'is_active': user.is_active,
                'date_joined': user.date_joined,
                'orders_count': total_orders,
                'lifetime_value': str(round(float(ltv_val), 2)),
                'last_order_date': last_order.created_at if last_order else None,
                'tags': user.tags or [],
            })

        # Calculate overall KPI metrics
        total_customers = len(customers_data)
        active_customers = sum(1 for c in customers_data if c['is_active'])
        grand_ltv = sum(float(c['lifetime_value']) for c in customers_data)
        total_orders_all = sum(c['orders_count'] for c in customers_data)
        aov = round(grand_ltv / total_orders_all, 2) if total_orders_all > 0 else 0.0

        return Response({
            'metrics': {
                'total_customers': total_customers,
                'active_customers': active_customers,
                'total_ltv': str(round(grand_ltv, 2)),
                'average_order_value': str(aov),
            },
            'customers': customers_data
        })

    def post(self, request):
        email = request.data.get('email', '').strip() or None
        phone = request.data.get('phone', '').strip() or None
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        password = request.data.get('password', '').strip()
        tags = request.data.get('tags', [])
        notes = request.data.get('notes', '')

        if not email and not phone:
            return Response({'detail': 'Either email or phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if email and CustomUser.objects.filter(email=email).exists():
            return Response({'detail': 'Customer with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if phone and CustomUser.objects.filter(phone=phone).exists():
            return Response({'detail': 'Customer with this phone number already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.create_user(
            email=email,
            phone=phone,
            password=password or 'Welcome123!',
            first_name=first_name,
            last_name=last_name,
            is_staff=False,
            tags=tags if isinstance(tags, list) else [],
            notes=notes
        )

        log_action(request.user, f"Created customer profile for {user.full_name or user.email}", request)

        return Response({
            'id': str(user.id),
            'email': user.email,
            'phone': user.phone,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_active': user.is_active,
            'date_joined': user.date_joined,
        }, status=status.HTTP_201_CREATED)


class MerchantCustomerDetailView(APIView):
    """
    GET, PUT /api/auth/merchant/customers/<id>/
    Detailed profile, order history, tags, notes, and profile update endpoint.
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request, pk: str):
        try:
            user = CustomUser.objects.get(id=pk)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        paid_statuses = ['Paid', 'Shipped', 'Delivered', 'Processing']
        orders_qs = Order.objects.filter(user=user).prefetch_related('items__product').order_by('-created_at')

        orders_data = []
        recent_address = None

        for order in orders_qs:
            if not recent_address and order.shipping_address:
                recent_address = order.shipping_address

            items_count = sum(item.quantity for item in order.items.all())
            orders_data.append({
                'id': str(order.id),
                'order_number': order.order_number,
                'status': order.status,
                'total': str(order.total),
                'subtotal': str(order.subtotal),
                'created_at': order.created_at,
                'items_count': items_count,
            })

        paid_orders = orders_qs.filter(status__in=paid_statuses)
        ltv_val = paid_orders.aggregate(total_sum=Sum('total'))['total_sum'] or 0.0
        total_orders_count = orders_qs.count()
        aov_val = round(float(ltv_val) / total_orders_count, 2) if total_orders_count > 0 else 0.0

        return Response({
            'id': str(user.id),
            'email': user.email or 'N/A',
            'phone': user.phone or 'N/A',
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.full_name or 'Guest Customer',
            'is_active': user.is_active,
            'date_joined': user.date_joined,
            'tags': user.tags or [],
            'notes': user.notes or '',
            'metrics': {
                'lifetime_value': str(round(float(ltv_val), 2)),
                'orders_count': total_orders_count,
                'average_order_value': str(aov_val),
            },
            'recent_address': recent_address,
            'orders': orders_data,
        })

    def put(self, request, pk: str):
        try:
            user = CustomUser.objects.get(id=pk)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        phone = request.data.get('phone')
        tags = request.data.get('tags')
        notes = request.data.get('notes')
        is_active = request.data.get('is_active')

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if email is not None and email != user.email:
            if CustomUser.objects.filter(email=email).exclude(id=user.id).exists():
                return Response({'detail': 'Email already in use.'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email
        if phone is not None and phone != user.phone:
            if CustomUser.objects.filter(phone=phone).exclude(id=user.id).exists():
                return Response({'detail': 'Phone number already in use.'}, status=status.HTTP_400_BAD_REQUEST)
            user.phone = phone
        if tags is not None and isinstance(tags, list):
            user.tags = tags
        if notes is not None:
            user.notes = notes
        if is_active is not None:
            user.is_active = bool(is_active)

        user.save()
        log_action(request.user, f"Updated customer profile for {user.full_name or user.email}", request)

        return Response({'detail': 'Customer updated successfully.'})


class MerchantCustomerToggleStatusView(APIView):
    """
    POST /api/auth/merchant/customers/<id>/toggle-status/
    Enable or disable customer login access.
    """
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def post(self, request, pk: str):
        try:
            user = CustomUser.objects.get(id=pk)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])

        action_label = "Enabled" if user.is_active else "Disabled"
        log_action(request.user, f"{action_label} account for customer {user.full_name or user.email}", request)

        return Response({
            'id': str(user.id),
            'is_active': user.is_active,
            'detail': f'Customer account {action_label.lower()} successfully.'
        })
