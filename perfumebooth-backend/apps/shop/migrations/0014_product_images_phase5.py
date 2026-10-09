from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('shop', '0013_productvariant_phase4')]

    operations = [
        migrations.AddField(
            model_name='productimportjob', name='image_operations',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='productimage', name='position',
            field=models.PositiveIntegerField(db_index=True, default=0),
        ),
        migrations.AddField(
            model_name='productimage', name='is_primary',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='productimage', name='source_url',
            field=models.URLField(blank=True, default='', max_length=2000),
        ),
        migrations.AlterModelOptions(
            name='productimage',
            options={
                'ordering': ['position', 'created_at'],
                'verbose_name': 'Product Image',
                'verbose_name_plural': 'Product Images',
            },
        ),
        migrations.AddConstraint(
            model_name='productimage',
            constraint=models.UniqueConstraint(
                condition=models.Q(is_primary=True), fields=('product',),
                name='one_primary_image_per_product',
            ),
        ),
    ]
