from django.core.management.base import BaseCommand
from apps.shop.models import Product
from apps.shop.category_utils import clean_fragrance_category

class Command(BaseCommand):
    help = 'Clean and normalize fragrance category taxonomy strings across all products'

    def handle(self, *args, **options):
        updated = 0
        total = Product.objects.count()
        self.stdout.write(f'Scanning {total} products for category normalization...')

        batch = []
        for p in Product.objects.all():
            attrs = dict(p.attributes or {})
            old_cat = attrs.get('category', '')
            new_cat = clean_fragrance_category(
                raw_category=old_cat,
                product_type=attrs.get('productType', ''),
                title=p.title
            )
            if old_cat != new_cat:
                attrs['category'] = new_cat
                p.attributes = attrs
                batch.append(p)
                updated += 1

        if batch:
            Product.objects.bulk_update(batch, ['attributes'], batch_size=200)

        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated}/{total} products to clean fragrance categories.'))

