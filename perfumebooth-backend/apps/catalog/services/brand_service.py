"""
Brand Service — Manages product brand catalog and file sync.
"""
import os
import re
import json
import logging
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

BRANDS_FILE_PATH = os.path.join(settings.BASE_DIR, 'brands.json')
CONSTANTS_PATH = '/app/constants.ts'


class BrandService:
    """Provides methods to load, save, update, and delete brands from the catalog."""

    CACHE_KEY = 'catalog:brands'

    @classmethod
    def get_constants_path(cls) -> str | None:
        """Resolve path to constants.ts across container and local environments."""
        env_path = os.environ.get('CONSTANTS_PATH')
        if env_path and os.path.exists(env_path):
            return env_path
        if os.path.exists(CONSTANTS_PATH):
            return CONSTANTS_PATH
        local_path = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'perfumebooth', 'src', 'lib', 'constants.ts'))
        if os.path.exists(local_path):
            return local_path
        return None

    @classmethod
    def load_brands(cls) -> list:
        # 1. Try to read from constants.ts first
        constants_file = cls.get_constants_path()
        if constants_file:
            try:
                with open(constants_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                match = re.search(r'export\s+const\s+TOP_BRANDS\s*=\s*\[(.*?)\]', content, re.DOTALL)
                if match:
                    brands_block = match.group(1)
                    brands = re.findall(r'["\'](.*?)["\']', brands_block)
                    return [b.strip() for b in brands if b.strip()]
            except Exception as e:
                logger.warning("Error loading brands from constants.ts: %s", e)

        # 2. Fallback to brands.json
        if not os.path.exists(BRANDS_FILE_PATH):
            default_brands = [
                "Al Haramain", "Arabiyat Prestige", "Lomani", "Louis Cardin",
                "MPF", "New NB", "Otoori", "Lattafa", "Swiss Arabian",
                "PerfumeBooth", "Armaf", "Creed", "Chanel"
            ]
            try:
                with open(BRANDS_FILE_PATH, 'w', encoding='utf-8') as f:
                    json.dump(default_brands, f, indent=2)
            except Exception as e:
                logger.warning("Could not write initial brands.json: %s", e)
            return default_brands

        try:
            with open(BRANDS_FILE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    @classmethod
    def get_cached_brands(cls) -> list:
        cached = cache.get(cls.CACHE_KEY)
        if cached is not None:
            return cached
        brands = cls.load_brands()
        cache.set(cls.CACHE_KEY, brands, timeout=86400)
        return brands

    @classmethod
    def _write_constants_file(cls, brands: list) -> None:
        constants_file = cls.get_constants_path()
        if not constants_file or not os.path.exists(constants_file):
            return
        try:
            with open(constants_file, 'r', encoding='utf-8') as f:
                content = f.read()
            formatted = "\n  " + ",\n  ".join([f'"{b}"' for b in brands]) + "\n"
            new_content = re.sub(
                r'export\s+const\s+TOP_BRANDS\s*=\s*\[.*?\];',
                f'export const TOP_BRANDS = [{formatted}];',
                content,
                flags=re.DOTALL
            )
            with open(constants_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
        except Exception as e:
            logger.warning("Error writing constants.ts: %s", e)

    @classmethod
    def _write_brands_json(cls, brands: list) -> None:
        try:
            with open(BRANDS_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(brands, f, indent=2)
        except Exception as e:
            logger.warning("Error saving brands to brands.json: %s", e)

    @classmethod
    def save_brand(cls, brand_name: str) -> list:
        if not brand_name or not brand_name.strip():
            return cls.load_brands()
        brand_name = brand_name.strip()

        brands = cls.load_brands()
        if not any(b.lower() == brand_name.lower() for b in brands):
            brands.append(brand_name)
            cls._write_constants_file(brands)
            cls._write_brands_json(brands)

        cache.delete(cls.CACHE_KEY)
        cache.clear()
        return brands

    @classmethod
    def update_brand(cls, old_name: str, new_name: str) -> list:
        """Rename an existing brand across constants, JSON, and products in DB."""
        if not old_name or not new_name:
            return cls.load_brands()
        old_name = old_name.strip()
        new_name = new_name.strip()
        if not old_name or not new_name or old_name == new_name:
            return cls.load_brands()

        brands = cls.load_brands()
        updated_brands = [new_name if b.lower() == old_name.lower() else b for b in brands]
        if not any(b.lower() == new_name.lower() for b in updated_brands):
            updated_brands.append(new_name)

        cls._write_constants_file(updated_brands)
        cls._write_brands_json(updated_brands)

        # Cascade to database products
        try:
            from apps.shop.models import Product
            products = list(Product.objects.filter(attributes__brand__iexact=old_name))
            if products:
                for p in products:
                    attrs = dict(p.attributes or {})
                    attrs['brand'] = new_name
                    p.attributes = attrs
                Product.objects.bulk_update(products, ['attributes'], batch_size=200)
                logger.info("Updated %d products from brand '%s' to '%s'", len(products), old_name, new_name)
        except Exception as e:
            logger.warning("Error cascading brand rename on products: %s", e)

        cache.delete(cls.CACHE_KEY)
        cache.clear()
        return updated_brands

    @classmethod
    def delete_brand(cls, brand_name: str) -> list:
        if not brand_name or not brand_name.strip():
            return cls.load_brands()
        brand_name = brand_name.strip()

        brands = cls.load_brands()
        filtered = [b for b in brands if b.lower() != brand_name.lower()]
        cls._write_constants_file(filtered)
        cls._write_brands_json(filtered)

        cache.delete(cls.CACHE_KEY)
        cache.clear()
        return filtered
