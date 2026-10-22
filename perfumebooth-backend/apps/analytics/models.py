"""Anonymous, consented behavior; never a source of financial truth."""
from django.db import models


class Event(models.Model):
    id = models.UUIDField(primary_key=True)
    session_id = models.UUIDField(db_index=True)
    visitor_id = models.UUIDField()
    name = models.CharField(max_length=30, db_index=True)
    path = models.CharField(max_length=200)
    properties = models.JSONField(default=dict)
    consent_version = models.CharField(max_length=20)
    fingerprint = models.CharField(max_length=64)
    received_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed_at = models.DateTimeField(null=True, db_index=True)


class OrderAttribution(models.Model):
    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, primary_key=True)
    session_id = models.UUIDField(db_index=True)
    visitor_id = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)


class ProviderSnapshot(models.Model):
    provider = models.CharField(max_length=20)
    account = models.CharField(max_length=255)
    day = models.DateField(db_index=True)
    rows = models.JSONField(default=list)
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['provider', 'account', 'day'], name='unique_provider_day')]


class ProviderSync(models.Model):
    provider = models.CharField(max_length=20, primary_key=True)
    last_attempt = models.DateTimeField(null=True)
    last_success = models.DateTimeField(null=True)
    status = models.CharField(max_length=30, default='not_connected')
