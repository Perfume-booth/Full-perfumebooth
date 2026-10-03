"""
Money Representation and Formatting Utilities
Enforces representation of all monetary values as two-decimal strings (e.g. '1299.00').
"""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

TWO_PLACES = Decimal('0.01')


def to_decimal(value, default="0.00") -> Decimal:
    """Safely convert any numeric or string representation into a Decimal."""
    if value is None:
        return Decimal(default)
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


def format_money(value) -> str:
    """
    Format money as a standard 2-decimal string.
    Example:
        format_money(1299) -> "1299.00"
        format_money(49.9) -> "49.90"
        format_money("1500.555") -> "1500.56"
        format_money(None) -> "0.00"
    """
    dec = to_decimal(value)
    return str(dec.quantize(TWO_PLACES, rounding=ROUND_HALF_UP))
