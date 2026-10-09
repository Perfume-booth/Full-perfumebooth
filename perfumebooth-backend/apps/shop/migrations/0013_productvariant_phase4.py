from django.db import migrations, models
from django.db.models import Count


def reject_duplicate_variant_skus(apps, schema_editor):
    ProductVariant = apps.get_model('shop', 'ProductVariant')
    duplicates = list(
        ProductVariant.objects.values('sku').annotate(count=Count('id')).filter(count__gt=1)[:10]
    )
    if duplicates:
        skus = ', '.join(item['sku'] for item in duplicates)
        raise RuntimeError(
            f'Cannot enforce unique variant SKUs. Resolve duplicate SKUs first: {skus}'
        )


class Migration(migrations.Migration):
    dependencies = [('shop', '0012_productimportjob_creates')]

    operations = [
        migrations.AddField(
            model_name='productvariant',
            name='is_active',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AddField(
            model_name='productimportjob',
            name='variant_operations',
            field=models.JSONField(default=list),
        ),
        migrations.RunPython(reject_duplicate_variant_skus, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='productvariant',
            constraint=models.UniqueConstraint(fields=('sku',), name='unique_product_variant_sku'),
        ),
    ]
