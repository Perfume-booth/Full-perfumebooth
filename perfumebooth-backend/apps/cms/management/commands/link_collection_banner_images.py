"""Reuse existing page banner files for empty collection image fields."""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.shop.models import AutoCollection, PageBanner


class Command(BaseCommand):
    help = 'Preview exact banner matches; --apply fills only empty collection images.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        banners = {}
        for banner in PageBanner.objects.prefetch_related('images'):
            first = next(iter(banner.images.all()), None)
            if first and first.image:
                banners[banner.page_slug] = first.image.name
        count = 0
        with transaction.atomic():
            for collection in AutoCollection.objects.select_for_update():
                page = collection.slug.rsplit('/', 1)[-1]
                if collection.image or page not in banners:
                    continue
                if options['apply']:
                    collection.image = banners[page]
                    collection.save(update_fields=['image'])
                count += 1
                self.stdout.write(collection.slug)
        self.stdout.write(f'{"Updated" if options["apply"] else "Matched"}: {count}')
