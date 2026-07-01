import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='CMSPage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=300)),
                ('slug', models.SlugField(max_length=300, unique=True)),
                ('meta_title', models.CharField(blank=True, max_length=300)),
                ('meta_description', models.TextField(blank=True)),
                ('is_published', models.BooleanField(db_index=True, default=False)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'CMS Page',
                'verbose_name_plural': 'CMS Pages',
                'db_table': 'cms_page',
                'ordering': ['slug'],
            },
        ),
        migrations.CreateModel(
            name='CMSSection',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('type', models.CharField(choices=[('HeroBanner', 'Hero Banner'), ('ProductCarousel', 'Product Carousel'), ('TextBlock', 'Text Block'), ('BrandLogos', 'Brand Logos'), ('InstagramFeed', 'Instagram Feed'), ('TestimonialSlider', 'Testimonial Slider'), ('Custom', 'Custom')], max_length=50)),
                ('sort_order', models.PositiveIntegerField(db_index=True, default=0)),
                ('content_payload', models.JSONField(default=dict)),
                ('is_visible', models.BooleanField(default=True)),
                ('page', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sections', to='cms.cmspage')),
            ],
            options={
                'verbose_name': 'CMS Section',
                'verbose_name_plural': 'CMS Sections',
                'db_table': 'cms_section',
                'ordering': ['sort_order'],
            },
        ),
    ]
