from django.db import migrations
from django.contrib.postgres.operations import TrigramExtension


def create_trgm_index(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS product_title_trgm_idx ON shop_product USING gin (title gin_trgm_ops);"
            )


def drop_trgm_index(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("DROP INDEX IF EXISTS product_title_trgm_idx;")


class Migration(migrations.Migration):
    dependencies = [
        ('shop', '0020_import_schedules_snapshots_mappings'),
    ]

    operations = [
        TrigramExtension(),
        migrations.RunPython(create_trgm_index, drop_trgm_index),
    ]
