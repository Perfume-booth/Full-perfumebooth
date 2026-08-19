"""
Authentication & RBAC Models
─────────────────────────────
CustomUser  — email-based user (replaces Django's default User)
Role        — named permission sets (Super Admin, Manager, Warehouse Clerk)
UserRole    — M2M join table assigning roles to users
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class CustomUserManager(BaseUserManager):
    """Manager for email/phone authenticated users."""

    def create_user(self, email: str = None, phone: str = None, password: str = None, **extra_fields):
        if not email and not phone:
            raise ValueError('Either an email address or phone number is required.')
        
        if email:
            email = self.normalize_email(email)
        else:
            email = None
            
        if phone:
            phone = phone.strip()
        else:
            phone = None

        user = self.model(email=email, phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str = None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email=email, password=password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model supporting email or phone as identifiers.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, null=True, blank=True, db_index=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default='')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        db_table = 'auth_custom_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email'], name='user_email_idx'),
            models.Index(fields=['phone'], name='user_phone_idx'),
        ]

    def __str__(self) -> str:
        return self.email or self.phone or str(self.id)

    @property
    def full_name(self) -> str:
        return f'{self.first_name} {self.last_name}'.strip()



class Role(models.Model):
    """
    Named role with a JSONB permissions payload.
    Examples: 'Super Admin', 'Manager', 'Warehouse Clerk'
    """
    name = models.CharField(max_length=100, unique=True)
    permissions = models.JSONField(default=dict, help_text='Granular permission flags as JSON')

    class Meta:
        db_table = 'auth_role'
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'

    def __str__(self) -> str:
        return self.name


class UserRole(models.Model):
    """M2M join table — a user can hold multiple roles."""
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='roles'
    )
    role = models.ForeignKey(
        Role, on_delete=models.CASCADE, related_name='user_roles'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'auth_user_role'
        unique_together = ('user', 'role')
        verbose_name = 'User Role'
        verbose_name_plural = 'User Roles'

    def __str__(self) -> str:
        return f'{self.user.email} → {self.role.name}'


class AuditLog(models.Model):
    """
    Tracks actions performed by staff/merchants in the system.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='audit_logs',
        db_index=True
    )
    action = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'auth_audit_log'
        ordering = ['-created_at']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self) -> str:
        return f'{self.user.full_name or self.user.email} — {self.action} at {self.created_at}'


class OTPVerification(models.Model):
    """
    Temporary table to check mobile number verification codes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, db_index=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        db_table = 'auth_otp_verification'
        verbose_name = 'OTP Verification'
        verbose_name_plural = 'OTP Verifications'

    def __str__(self) -> str:
        return f'{self.phone} — {self.code} (verified: {self.is_verified})'


class SocialAccount(models.Model):
    """
    Maps social logins to our CustomUser instance.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='social_accounts')
    provider = models.CharField(max_length=50)  # 'google', 'facebook', 'apple'
    uid = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'auth_social_account'
        unique_together = ('provider', 'uid')
        verbose_name = 'Social Account'
        verbose_name_plural = 'Social Accounts'

    def __str__(self) -> str:
        return f'{self.user} — {self.provider} ({self.uid})'


class CustomerAddress(models.Model):
    """
    Saved shipping/billing addresses for customers.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='addresses')
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    address1 = models.CharField(max_length=255)
    address2 = models.CharField(max_length=255, blank=True, default='')
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, default='India')
    zip = models.CharField(max_length=20)
    phone = models.CharField(max_length=20, blank=True, default='')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'auth_customer_address'
        ordering = ['-is_default', '-created_at']
        verbose_name = 'Customer Address'
        verbose_name_plural = 'Customer Addresses'

    def __str__(self) -> str:
        return f'{self.user.email} — {self.address1}, {self.city}'

