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
    """Manager for email-authenticated users."""

    def create_user(self, email: str, password: str = None, **extra_fields):
        if not email:
            raise ValueError('An email address is required.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str = None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model using email as the unique identifier.
    Replaces Django's default username-based User.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        db_table = 'auth_custom_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email'], name='user_email_idx'),
        ]

    def __str__(self) -> str:
        return self.email

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

