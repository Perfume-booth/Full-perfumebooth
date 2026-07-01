from .models import AuditLog

def log_action(user, action, request=None):
    """
    Creates an AuditLog record for the given user action.
    """
    if not user or not user.is_authenticated:
        return
        
    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

    AuditLog.objects.create(
        user=user,
        action=action,
        ip_address=ip_address
    )
