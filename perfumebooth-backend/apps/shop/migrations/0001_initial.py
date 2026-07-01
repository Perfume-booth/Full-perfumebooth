import uuid
# pyrefly: ignore [missing-import]
from django.db import migrations, models
# pyrefly: ignore [missing-import]
import django.db.models.deletion
# pyrefly: ignore [missing-import]
import pgvector.django


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        pgvector.django.VectorExtension(),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=500)),
                ('slug', models.SlugField(max_length=500, unique=True)),
                ('sku', models.CharField(db_index=True, max_length=200, unique=True)),
                ('description', models.TextField(blank=True)),
                ('price', models.DecimalField(db_index=True, decimal_places=2, max_digits=10)),
                ('compare_at_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('image', models.ImageField(blank=True, null=True, upload_to='products/')),
                ('attributes', models.JSONField(default=dict)),
                ('embedding', pgvector.django.VectorField(blank=True, dimensions=384, null=True)),
                ('is_online', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Product',
                'verbose_name_plural': 'Products',
                'db_table': 'shop_product',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Inventory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stock_level', models.PositiveIntegerField(default=0)),
                ('reserved_stock', models.PositiveIntegerField(default=0)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='inventory', to='shop.product')),
            ],
            options={
                'verbose_name': 'Inventory',
                'verbose_name_plural': 'Inventories',
                'db_table': 'shop_inventory',
            },
        ),
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('image', models.ImageField(upload_to='products/')),
                ('alt_text', models.CharField(blank=True, default='', max_length=500)),
                ('width', models.PositiveIntegerField(blank=True, null=True)),
                ('height', models.PositiveIntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='shop.product')),
            ],
            options={
                'verbose_name': 'Product Image',
                'verbose_name_plural': 'Product Images',
                'db_table': 'shop_product_image',
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['slug'], name='product_slug_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['sku'], name='product_sku_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['price'], name='product_price_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['is_online'], name='product_online_idx'),
        ),
    ]
