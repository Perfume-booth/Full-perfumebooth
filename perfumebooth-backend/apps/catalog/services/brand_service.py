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
    """Provides methods to load, save, and delete brands from the catalog."""

    CACHE_KEY = 'catalog:brands'

    @classmethod
    def load_brands(cls) -> list:
        # 1. Try to read from constants.ts first
        if os.path.exists(CONSTANTS_PATH):
            try:
                with open(CONSTANTS_PATH, 'r', encoding='utf-8') as f:
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
    def save_brand(cls, brand_name: str) -> list:
        if not brand_name:
            return cls.load_brands()
        brand_name = brand_name.strip()
        if not brand_name:
            return cls.load_brands()

        # 1. If constants.ts exists, update constants.ts
        if os.path.exists(CONSTANTS_PATH):
            try:
                with open(CONSTANTS_PATH, 'r', encoding='utf-8') as f:
                    content = f.read()

                match = re.search(r'export\s+const\s+TOP_BRANDS\s*=\s*\[(.*?)(,\s*)?\]', content, re.DOTALL)
                if match:
                    brands_block = match.group(1)
                    existing_brands = re.findall(r'["\'](.*?)["\']', brands_block)
                    if not any(b.lower() == brand_name.lower() for b in existing_brands):
                        clean_block = brands_block.rstrip()
                        if clean_block and not clean_block.endswith(','):
                            new_block = clean_block + f',\n  "{brand_name}"'
                        else:
                            new_block = clean_block + f'\n  "{brand_name}"'

                        new_content = content.replace(brands_block, new_block)
                        with open(CONSTANTS_PATH, 'w', encoding='utf-8') as f:
                            f.write(new_content)
            except Exception as e:
                logger.warning("Error saving brand to constants.ts: %s", e)

        # 2. Sync brands.json
        brands = cls.load_brands()
        if not any(b.lower() == brand_name.lower() for b in brands):
            brands.append(brand_name)
            try:
                with open(BRANDS_FILE_PATH, 'w', encoding='utf-8') as f:
                    json.dump(brands, f, indent=2)
            except Exception as e:
                logger.warning("Error saving brand to brands.json: %s", e)

        cache.delete(cls.CACHE_KEY)
        cache.clear()
        return brands

    @classmethod
    def delete_brand(cls, brand_name: str) -> list:
        if not brand_name:
            return cls.load_brands()
        brand_name = brand_name.strip()

        # 1. Update constants.ts if it exists
        if os.path.exists(CONSTANTS_PATH):
            try:
                with open(CONSTANTS_PATH, 'r', encoding='utf-8') as f:
                    content = f.read()

                match = re.search(r'export\s+const\s+TOP_BRANDS\s*=\s*\[(.*?)(,\s*)?\]', content, re.DOTALL)
                if match:
                    brands_block = match.group(1)
                    existing_brands = re.findall(r'["\'](.*?)["\']', brands_block)
                    new_brands = [b for b in existing_brands if b.lower() != brand_name.lower()]
                    new_block = "\n  " + ",\n  ".join([f'"{b}"' for b in new_brands]) + ",\n"
                    new_content = content.replace(brands_block, new_block)
                    with open(CONSTANTS_PATH, 'w', encoding='utf-8') as f:
                        f.write(new_content)
            except Exception as e:
                logger.warning("Error deleting brand from constants.ts: %s", e)

        # 2. Fallback / Sync brands.json
        if os.path.exists(BRANDS_FILE_PATH):
            try:
                with open(BRANDS_FILE_PATH, 'r', encoding='utf-8') as f:
                    brands = json.load(f)
                brands = [b for b in brands if b.lower() != brand_name.lower()]
                with open(BRANDS_FILE_PATH, 'w', encoding='utf-8') as f:
                    json.dump(brands, f, indent=2)
            except Exception:
                pass

        cache.delete(cls.CACHE_KEY)
        cache.clear()
        return cls.load_brands()
