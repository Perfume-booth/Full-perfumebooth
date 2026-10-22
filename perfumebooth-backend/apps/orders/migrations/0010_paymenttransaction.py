from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('orders', '0009_order_item_reporting_snapshots')]
    operations = [migrations.CreateModel(
        name='PaymentTransaction',
        fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('gateway', models.CharField(default='razorpay', max_length=30)),
            ('reference', models.CharField(max_length=100)),
            ('payment_id', models.CharField(db_index=True, max_length=100)),
            ('kind', models.CharField(choices=[('capture', 'Capture'), ('refund', 'Refund')], max_length=10)),
            ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
            ('currency', models.CharField(max_length=3)),
            ('method', models.CharField(blank=True, max_length=30)),
            ('occurred_at', models.DateTimeField(db_index=True)),
            ('time_basis', models.CharField(default='received_at', max_length=30)),
            ('recorded_at', models.DateTimeField(auto_now_add=True)),
            ('order', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='payment_transactions', to='orders.order')),
        ],
        options={'constraints': [
            models.UniqueConstraint(fields=('gateway', 'kind', 'reference'), name='unique_payment_movement'),
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='payment_movement_positive'),
        ]},
    )]
