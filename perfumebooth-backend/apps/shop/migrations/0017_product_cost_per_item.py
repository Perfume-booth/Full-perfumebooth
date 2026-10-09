from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('shop', '0016_product_import_advanced_bulk'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='cost_per_item',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
