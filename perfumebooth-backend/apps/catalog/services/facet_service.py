"""
Facet Service — Computes dynamic catalog filter facets from active products.
"""
from django.core.cache import cache
from apps.shop.models import Product


class FacetService:
    """Aggregates filter facets (gender, brand, category, occasion, etc.) for product discovery."""

    CACHE_KEY = 'catalog:facets'
    CACHE_TIMEOUT = 300  # 5 minutes

    @classmethod
    def get_facets(cls, force_refresh: bool = False) -> dict:
        if not force_refresh:
            cached = cache.get(cls.CACHE_KEY)
            if cached is not None:
                return cached

        products = Product.objects.filter(is_online=True).values('attributes')

        genders = {}
        brands = {}
        categories = {}
        product_types = {}
        occasions = {}
        seasons = {}
        all_tags = set()

        for item in products:
            attrs = item.get('attributes') or {}

            # Gender
            gender = attrs.get('gender', '').strip()
            if gender:
                genders[gender] = genders.get(gender, 0) + 1

            # Brand
            brand = (attrs.get('brand') or attrs.get('vendor') or '').strip()
            if brand:
                brands[brand] = brands.get(brand, 0) + 1

            # Category
            category = attrs.get('category', '').strip()
            if category:
                categories[category] = categories.get(category, 0) + 1

            # Product Type
            pt = attrs.get('productType', '').strip()
            if pt:
                product_types[pt] = product_types.get(pt, 0) + 1

            # Occasion
            occasion = attrs.get('occasion', '').strip()
            if occasion:
                occasions[occasion] = occasions.get(occasion, 0) + 1

            # Season
            season = attrs.get('season', '').strip()
            if season:
                seasons[season] = seasons.get(season, 0) + 1

            # Tags
            tags = attrs.get('tags', [])
            if isinstance(tags, list):
                all_tags.update(tags)

        def to_facet_list(counter):
            return sorted(
                [{'value': k, 'count': v} for k, v in counter.items()],
                key=lambda x: x['count'],
                reverse=True
            )

        data = {
            'genders': to_facet_list(genders),
            'brands': to_facet_list(brands),
            'categories': to_facet_list(categories),
            'productTypes': to_facet_list(product_types),
            'occasions': to_facet_list(occasions),
            'seasons': to_facet_list(seasons),
            'tags': sorted(list(all_tags)),
        }

        cache.set(cls.CACHE_KEY, data, timeout=cls.CACHE_TIMEOUT)
        return data
