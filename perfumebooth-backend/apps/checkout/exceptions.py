"""
Checkout Domain Exceptions
"""
from rest_framework import status
from core.constants import ErrorCode, APIError


class CheckoutException(APIError):
    """Base exception for all checkout domain errors."""
    pass


class EmptyCartException(CheckoutException):
    def __init__(self, message: str = "Cart is empty. Please add items before checkout."):
        super().__init__(
            code=ErrorCode.CART_EMPTY,
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST
        )


class InvalidQuantityException(CheckoutException):
    def __init__(self, message: str = "Item quantity must be at least 1."):
        super().__init__(
            code=ErrorCode.VALIDATION_ERROR,
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST
        )


class ProductNotFoundException(CheckoutException):
    def __init__(self, product_id: str):
        super().__init__(
            code=ErrorCode.NOT_FOUND,
            message=f"Product with ID '{product_id}' was not found.",
            fields={'product_id': [str(product_id)]},
            status_code=status.HTTP_404_NOT_FOUND
        )


class ProductUnavailableException(CheckoutException):
    def __init__(self, product_id: str, message: str = "This product is currently unavailable."):
        super().__init__(
            code=ErrorCode.PRODUCT_UNAVAILABLE,
            message=message,
            fields={'product_id': [str(product_id)]},
            status_code=status.HTTP_409_CONFLICT
        )


class VariantNotFoundException(CheckoutException):
    def __init__(self, product_title: str, variant_id: str):
        super().__init__(
            code=ErrorCode.NOT_FOUND,
            message=f"Variant '{variant_id}' for product '{product_title}' was not found.",
            fields={'variant_id': [str(variant_id)]},
            status_code=status.HTTP_404_NOT_FOUND
        )


class InsufficientStockException(CheckoutException):
    def __init__(self, product_title: str, available: int, requested: int, variant_title: str = None):
        title = f"{product_title} ({variant_title})" if variant_title else product_title
        message = f"Insufficient stock for {title}. Only {available} available."
        super().__init__(
            code=ErrorCode.INSUFFICIENT_STOCK,
            message=message,
            fields={'stock': [f"Available: {available}, Requested: {requested}"]},
            status_code=status.HTTP_400_BAD_REQUEST
        )


class InvalidCouponException(CheckoutException):
    def __init__(self, code: str, message: str = None):
        super().__init__(
            code=ErrorCode.INVALID_COUPON,
            message=message or f"Coupon code '{code}' is invalid or expired.",
            fields={'coupon_code': [str(code)]},
            status_code=status.HTTP_400_BAD_REQUEST
        )
