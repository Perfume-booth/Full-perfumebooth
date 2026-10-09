import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('shop', '0010_productvariant_reserved_stock'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductImportJob',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('filename', models.CharField(max_length=255)),
                ('file_sha256', models.CharField(max_length=64)),
                ('mode', models.CharField(default='UPDATE_ONLY', max_length=32)),
                ('status', models.CharField(choices=[('preview_ready', 'Preview ready'), ('invalid', 'Invalid'), ('applied', 'Applied'), ('failed', 'Failed')], max_length=32)),
                ('summary', models.JSONField(default=dict)),
                ('changes', models.JSONField(default=list)),
                ('errors', models.JSONField(default=list)),
                ('applied_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='product_import_jobs', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'shop_product_import_job', 'ordering': ['-created_at']},
        ),
    ]
