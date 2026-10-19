import re
# pyrefly: ignore [missing-import]
from django.db import transaction
from .models import Product, AutoCollection, ProductCollection

class CollectionSyncService:
    @staticmethod
    def sanitize_slug(value):
        # strict normalization: lowercase, kebab-case, removing special characters
        val = value.strip().lower()
        val = re.sub(r'[^a-z0-9\s-]', '', val)
        val = re.sub(r'[\s-]+', '-', val)
        return val.strip('-')

    @classmethod
    @transaction.atomic
    def syncProductCollections(cls, product):
        """
        Synchronizes a product's collections based on its attributes.
        Fulfills:
        - Zero Manual Overhead: Dynamic generation from real-time state.
        - Open-Closed Principle (Registry-based design).
        - Data Integrity: Runs entirely in transaction block.
        - Performance: Anti N+1 bulk database operations.
        - No-Op Guard: Early exit if no changes detected.
        """
        attrs = product.attributes or {}
        
        brand_val = attrs.get('brand') or attrs.get('vendor')
        category_val = attrs.get('category')
        gender_val = attrs.get('gender')
        type_val = attrs.get('productType') or attrs.get('type')
        
        # Extract notes list
        notes_list = []
        for note_field in ['top_notes', 'middle_notes', 'base_notes']:
            field_val = attrs.get(note_field, '')
            if field_val:
                for note in field_val.split(','):
                    note = note.strip()
                    if note and note.lower() not in [n.lower() for n in notes_list]:
                        notes_list.append(note)

        # OCP Taxonomy Registry mapping attributes to collection_type
        registry = [
            {'type': 'brand', 'values': [brand_val] if brand_val else []},
            {'type': 'category', 'values': [category_val] if category_val else []},
            {'type': 'gender', 'values': [gender_val] if gender_val else []},
            {'type': 'type', 'values': [type_val] if type_val else []},
            {'type': 'note', 'values': notes_list},
        ]

        # Extract target collections (name, type, unique slug)
        target_collections = []
        for reg in registry:
            col_type = reg['type']
            for val in reg['values']:
                cleaned_val = val.strip()
                if cleaned_val:
                    sanitized = cls.sanitize_slug(cleaned_val)
                    slug_str = f"{col_type}/{sanitized}"
                    target_collections.append({
                        'name': cleaned_val,
                        'type': col_type,
                        'slug': slug_str
                    })

        # Identify currently linked collections
        # Synchronize only generated taxonomy links; manual merchandising is
        # owned by the collection editor and must survive ordinary product edits.
        current_links = ProductCollection.objects.filter(
            product=product,
            collection__collection_type__in=[entry['type'] for entry in registry],
        ).select_related('collection')
        current_slugs = {link.collection.slug for link in current_links}
        target_slugs = {tc['slug'] for tc in target_collections}

        # In-Memory cache of collections (Anti N+1 Directive)
        all_target_slugs = list(target_slugs)
        existing_collections = {
            col.slug: col for col in AutoCollection.objects.filter(slug__in=all_target_slugs)
        }

        # Filter out target collections where this product is manually excluded
        excluded_col_slugs = set()
        for slug_str in list(target_slugs):
            col = existing_collections.get(slug_str)
            if col and col.excluded_products and str(product.id) in col.excluded_products:
                excluded_col_slugs.add(slug_str)
        
        target_slugs = target_slugs - excluded_col_slugs

        # No-Op Guard
        if current_slugs == target_slugs:
            return True

        # Create collection if missing (Upsert)
        for tc in target_collections:
            slug_str = tc['slug']
            if slug_str not in existing_collections:
                col = AutoCollection.objects.create(
                    name=tc['name'],
                    slug=slug_str,
                    collection_type=tc['type'],
                    status='active'
                )
                existing_collections[slug_str] = col

        # Detach removed collections
        slugs_to_remove = current_slugs - target_slugs
        if slugs_to_remove:
            ProductCollection.objects.filter(
                product=product,
                collection__slug__in=slugs_to_remove
            ).delete()

        # Attach new collections (Bulk Attach)
        slugs_to_add = target_slugs - current_slugs
        new_links = []
        for slug_str in slugs_to_add:
            col = existing_collections[slug_str]
            new_links.append(ProductCollection(product=product, collection=col))

        if new_links:
            ProductCollection.objects.bulk_create(new_links, ignore_conflicts=True)

        return True
