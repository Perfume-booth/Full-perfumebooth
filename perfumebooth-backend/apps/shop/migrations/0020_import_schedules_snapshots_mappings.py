from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('shop', '0019_product_barcode'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.AddField(model_name='productimportjob', name='column_mapping', field=models.JSONField(default=dict)),
        migrations.AddField(model_name='productimportjob', name='snapshot', field=models.JSONField(default=dict)),
        migrations.AddField(model_name='productimportjob', name='undone_at', field=models.DateTimeField(null=True, blank=True)),
        migrations.AddField(model_name='productimportjob', name='scheduled_at', field=models.DateTimeField(null=True, blank=True, db_index=True)),
        migrations.AddField(model_name='productimportjob', name='sale_ends_at', field=models.DateTimeField(null=True, blank=True, db_index=True)),
        migrations.AddField(model_name='productimportjob', name='schedule_state', field=models.CharField(max_length=24, blank=True, default='', db_index=True)),
        migrations.CreateModel(name='ImportMapping', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('name', models.CharField(max_length=100)),
            ('columns', models.JSONField(default=dict)),
            ('updated_at', models.DateTimeField(auto_now=True)),
            ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
        ], options={'constraints': [models.UniqueConstraint(fields=('owner', 'name'), name='import_mapping_owner_name')]}),
    ]
