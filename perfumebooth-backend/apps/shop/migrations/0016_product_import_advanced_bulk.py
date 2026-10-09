from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('shop', '0015_product_import_background_processing')]

    operations = [
        migrations.AddField(
            model_name='productimportjob', name='bulk_operations',
            field=models.JSONField(default=list),
        ),
    ]
