from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('orders', '0008_promotion_coupon_category_restrictions_and_more')]
    operations = [
        migrations.AddField(model_name='orderitem', name='unit_cost_snapshot', field=models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)),
        migrations.AddField(model_name='orderitem', name='brand_snapshot', field=models.CharField(max_length=255, blank=True, default='')),
        migrations.AddField(model_name='orderitem', name='category_snapshot', field=models.CharField(max_length=255, blank=True, default='')),
    ]
