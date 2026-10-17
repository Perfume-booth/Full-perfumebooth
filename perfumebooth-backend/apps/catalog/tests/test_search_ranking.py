"""
Unit Tests for Phase 2: Search Ranking, Tokenization & Typo Matching
"""
from decimal import Decimal
from django.test import TestCase
from django.core.cache import cache
from apps.shop.models import Product, Inventory
from apps.catalog.services.catalog_service import CatalogService


class SearchRankingTests(TestCase):
    def setUp(self):
        cache.clear()
        self.p_exact = Product.objects.create(
            title="Amber Oud",
            slug="amber-oud-exact",
            sku="AMB-OUD-01",
            price=Decimal("4999.00"),
            is_online=True,
            attributes={"brand": "Al Haramain", "category": "Eau de Parfum"}
        )
        Inventory.objects.create(product=self.p_exact, stock_level=10)

        self.p_dubai = Product.objects.create(
            title="Al Haramain Amber Oud Aqua Dubai EDP 75 ML",
            slug="amber-oud-aqua-dubai",
            sku="AMB-OUD-DUB-02",
            price=Decimal("10499.00"),
            is_online=True,
            attributes={"brand": "Al Haramain", "category": "Eau de Parfum", "top_notes": "Bergamot, Citrus"}
        )
        Inventory.objects.create(product=self.p_dubai, stock_level=5)

        self.p_citrus = Product.objects.create(
            title="L'Aventure Citrus Fresh",
            slug="laventure-citrus",
            sku="LAV-CIT-03",
            price=Decimal("3500.00"),
            is_online=True,
            attributes={"brand": "Al Haramain", "category": "Eau de Parfum", "top_notes": "Lemon, Bergamot"}
        )
        Inventory.objects.create(product=self.p_citrus, stock_level=20)

    def test_tokenized_search_matches_multiple_words(self):
        """Searching 'aqua dubai' should match 'Al Haramain Amber Oud Aqua Dubai'."""
        results = CatalogService.get_products(search_query="aqua dubai")
        titles = [p['title'] for p in results]
        self.assertIn("Al Haramain Amber Oud Aqua Dubai EDP 75 ML", titles)

    def test_exact_title_match_ranks_highest(self):
        """Exact title match 'Amber Oud' should rank higher than longer derivative titles."""
        results = CatalogService.get_products(search_query="Amber Oud")
        self.assertTrue(len(results) >= 2)
        self.assertEqual(results[0]['title'], "Amber Oud")

    def test_search_by_scent_notes(self):
        """Searching note 'bergamot' should match products with bergamot top notes."""
        results = CatalogService.get_products(search_query="bergamot")
        titles = [p['title'] for p in results]
        self.assertIn("Al Haramain Amber Oud Aqua Dubai EDP 75 ML", titles)
        self.assertIn("L'Aventure Citrus Fresh", titles)

    def test_empty_search_query_returns_all(self):
        """Empty query returns catalog sorted by title without error."""
        results = CatalogService.get_products(search_query="")
        self.assertEqual(len(results), 3)
