from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('shop', '0011_productimportjob')]

    operations = [
        migrations.AddField(
            model_name='productimportjob',
            name='creates',
            field=models.JSONField(default=list),
        ),
    ]
