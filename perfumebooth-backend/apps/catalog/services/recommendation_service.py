"""
Recommendation Service — Scent profile matching and fragrance similarity scoring.
"""
from typing import List, Optional
from apps.shop.models import Product


class RecommendationService:
    """Calculates scent similarity scores based on olfactory notes, gender, and fragrance family."""

    @classmethod
    def get_recommendations(cls, slug: str, limit: int = 6, request=None) -> List[dict]:
        from .catalog_service import CatalogService

        try:
            target = Product.objects.get(slug=slug, is_online=True)
        except Product.DoesNotExist:
            return []

        target_attrs = target.attributes or {}
        target_notes = (
            f"{target_attrs.get('top_notes', '')} "
            f"{target_attrs.get('middle_notes', '')} "
            f"{target_attrs.get('base_notes', '')} "
            f"{target.description}"
        ).lower()
        target_tokens = set(target_notes.split())

        all_products = (
            Product.objects.filter(is_online=True)
            .exclude(id=target.id)
            .prefetch_related('images', 'variants')
        )
        scored_products = []

        for p in all_products:
            p_attrs = p.attributes or {}
            p_notes = (
                f"{p_attrs.get('top_notes', '')} "
                f"{p_attrs.get('middle_notes', '')} "
                f"{p_attrs.get('base_notes', '')} "
                f"{p.description}"
            ).lower()
            p_tokens = set(p_notes.split())

            intersection = target_tokens.intersection(p_tokens)
            union = target_tokens.union(p_tokens)

            # Jaccard similarity score on olfactory tokens
            jaccard = len(intersection) / len(union) if union else 0.0

            # Gender & Category family affinity boosts
            if p_attrs.get('gender') and p_attrs.get('gender') == target_attrs.get('gender'):
                jaccard += 0.1
            if p_attrs.get('category') and p_attrs.get('category') == target_attrs.get('category'):
                jaccard += 0.1

            scored_products.append((jaccard, p))

        scored_products.sort(key=lambda x: x[0], reverse=True)
        top_candidates = [item[1] for item in scored_products[:limit]]
        return [CatalogService.serialize_product(p, request) for p in top_candidates]
