from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('shop', '0021_enable_trigram_and_search_indexes')]

    operations = [
        migrations.AlterField(
            model_name='productreview', name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                                    related_name='reviews', to='authentication.customuser'),
        ),
        migrations.AddField(
            model_name='productreview', name='import_key',
            field=models.CharField(blank=True, null=True, unique=True, max_length=255),
        ),
        migrations.AddField(
            model_name='productreview', name='imported_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='productreview', name='import_metadata',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
