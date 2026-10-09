from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('shop', '0014_product_images_phase5')]

    operations = [
        migrations.AddField(model_name='productimportjob', name='source_file', field=models.FileField(blank=True, null=True, upload_to='catalog-imports/')),
        migrations.AddField(model_name='productimportjob', name='task_id', field=models.CharField(blank=True, db_index=True, default='', max_length=255)),
        migrations.AddField(model_name='productimportjob', name='operation', field=models.CharField(default='preview', max_length=16)),
        migrations.AddField(model_name='productimportjob', name='progress_current', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='productimportjob', name='progress_total', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='productimportjob', name='error_message', field=models.TextField(blank=True, default='')),
        migrations.AddField(model_name='productimportjob', name='started_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='productimportjob', name='finished_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AlterField(
            model_name='productimportjob', name='status',
            field=models.CharField(choices=[
                ('queued', 'Queued'), ('processing', 'Processing'),
                ('preview_ready', 'Preview ready'), ('invalid', 'Invalid'),
                ('apply_queued', 'Apply queued'), ('applying', 'Applying'),
                ('applied', 'Applied'), ('failed', 'Failed'), ('cancelled', 'Cancelled'),
            ], max_length=32),
        ),
    ]
