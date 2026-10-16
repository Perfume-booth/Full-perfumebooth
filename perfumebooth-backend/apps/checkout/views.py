"""
Checkout Views — Thin Controller Layer
Adheres to:
1. Validate request
2. Call CheckoutService
3. Serialize result
4. Return response
"""
from rest_framework import permissions, status
from rest_framework.views import APIView
from core.throttling import CheckoutRateThrottle
from core.responses import api_success
from .validators import validate_checkout_request
from .services.checkout_service import CheckoutService


class CheckoutView(APIView):
    """
    POST /api/v1/checkout/
    Thin controller endpoint for customer checkout.
    Delegates all pricing, inventory locking, and transaction logic to CheckoutService.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [CheckoutRateThrottle]

    def post(self, request):
        # 1. Validate request
        clean_input = validate_checkout_request(request.data)

        # 2. Call CheckoutService
        result = CheckoutService.idempotent_checkout(request.user, clean_input, request.headers.get('Idempotency-Key'))

        # 3. Serialize result and 4. Return response
        return api_success(result, status_code=status.HTTP_201_CREATED, request=request)
