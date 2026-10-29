"""Conservative description-only import with exact identity checks and backup."""
import csv
import json
from collections import defaultdict
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.core.cache import cache
from apps.shop.models import Product, ProductVariant


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('source')
        parser.add_argument('--apply', action='store_true')
        parser.add_argument('--backup')

    def handle(self, *args, **options):
        groups = defaultdict(lambda: {'descriptions': set(), 'skus': set()})
        with open(options['source'], encoding='utf-8-sig', newline='') as source:
            reader = csv.DictReader(source)
            if not {'Handle', 'Description'}.issubset(reader.fieldnames or []):
                raise CommandError('CSV must contain Handle and Description')
            for row in reader:
                handle = (row['Handle'] or '').strip()
                if not handle:
                    continue
                group = groups[handle]
                if (row['Description'] or '').strip():
                    group['descriptions'].add(row['Description'])
                if (row.get('Variant SKU') or '').strip():
                    group['skus'].add(row['Variant SKU'].strip())
        backup_path = Path(options['backup']) if options.get('backup') else None
        if options['apply'] and (not backup_path or backup_path.exists()):
            raise CommandError('Apply requires a new --backup JSON path')
        changes, issues = {}, []
        unchanged = blank = 0
        with transaction.atomic():
            products = list(Product.objects.select_for_update())
            by_slug = {p.slug: p for p in products}
            by_id = {p.pk: p for p in products}
            by_sku = defaultdict(set)
            for p in products:
                if p.sku:
                    by_sku[p.sku].add(p.pk)
            for sku, pk in ProductVariant.objects.values_list('sku', 'product_id'):
                if sku:
                    by_sku[sku].add(pk)
            for handle, group in groups.items():
                if not group['descriptions']:
                    blank += 1
                    continue
                if len(group['descriptions']) != 1:
                    issues.append((handle, 'conflicting descriptions'))
                    continue
                sku_ids = set().union(*(by_sku[s] for s in group['skus'])) if group['skus'] else set()
                product = by_slug.get(handle)
                if product and sku_ids and sku_ids != {product.pk}:
                    issues.append((handle, 'handle/SKU mismatch'))
                    continue
                if not product:
                    product = by_id[next(iter(sku_ids))] if len(sku_ids) == 1 else None
                if not product:
                    issues.append((handle, 'no unique existing match'))
                    continue
                description = next(iter(group['descriptions']))
                if product.pk in changes and changes[product.pk]['new'] != description:
                    raise CommandError('Multiple source handles target one product with different descriptions')
                if product.description == description:
                    unchanged += 1
                    continue
                changes[product.pk] = {'id': str(product.pk), 'slug': product.slug, 'source_handle': handle, 'old': product.description, 'new': description}
            self.stdout.write(f'Groups={len(groups)}; changes={len(changes)}; unchanged={unchanged}; blank={blank}; issues={len(issues)}')
            for handle, reason in issues:
                self.stdout.write(f'SKIPPED {handle}: {reason}')
            if options['apply']:
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                with backup_path.open('x', encoding='utf-8') as backup:
                    json.dump({'source': str(Path(options['source']).resolve()), 'changes': list(changes.values()), 'issues': issues}, backup, ensure_ascii=False, indent=2)
                for pk, change in changes.items():
                    Product.objects.filter(pk=pk).update(description=change['new'])
                transaction.on_commit(cache.clear)
                self.stdout.write(f'Applied {len(changes)} description-only updates. Backup: {backup_path}')
