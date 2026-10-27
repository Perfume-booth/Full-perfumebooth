"""Import an export once; no Judge.me runtime integration is required."""
import csv
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from apps.shop.review_imports import import_reviews


class Command(BaseCommand):
    help = 'Validate or import legacy reviews into the native review database'

    def add_arguments(self, parser):
        parser.add_argument('file_path')
        parser.add_argument('--source-store', required=True, help='Stable source shop domain for deduplication')
        parser.add_argument('--product-map', help='JSON object mapping source product IDs to exact catalog slugs')
        parser.add_argument('--apply', action='store_true', help='Write validated records; default is dry run')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        try:
            path = Path(options['file_path'])
            with path.open(encoding='utf-8-sig', newline='') as stream:
                if path.suffix.lower() == '.json':
                    data = json.load(stream)
                    records = data.get('reviews', []) if isinstance(data, dict) else data
                else:
                    records = list(csv.DictReader(stream))
            product_map = {}
            if options['product_map']:
                with Path(options['product_map']).open(encoding='utf-8-sig') as stream:
                    product_map = json.load(stream)
        except (OSError, ValueError) as exc:
            raise CommandError('Cannot read the export or mapping file.') from exc
        if not isinstance(records, list) or not all(isinstance(row, dict) for row in records):
            raise CommandError('Expected a list of review objects.')
        if not isinstance(product_map, dict) or not all(isinstance(v, str) for v in product_map.values()):
            raise CommandError('Product mapping must map source IDs to slug strings.')
        dry_run = options['dry_run'] or not options['apply']
        result = import_reviews(records, options['source_store'], dry_run=dry_run, product_map=product_map)
        self.stdout.write(json.dumps(result, indent=2))
        if result['errors']:
            raise CommandError('No reviews imported: resolve the reported rows and retry.')
        self.stdout.write('Dry run complete; no database writes.' if dry_run else 'Native review import complete.')
