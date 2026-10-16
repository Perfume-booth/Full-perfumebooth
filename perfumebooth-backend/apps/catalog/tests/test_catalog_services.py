"""
Catalog Services & Reorganized Domain Test Suite
Verifies:
1. CatalogService: Product querying, filtering, search, pagination, stock filters, and serialization.
2. FacetService: Dynamic facet aggregation across online products.
3. RecommendationService: Scent profile similarity matching & ranking.
4. BrandService: Brand loading, saving, and deletion.
5. Catalog API Endpoints: /api/v1/catalog/ routes and legacy /api/shop/ backward compatibility.
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.shop.models import Product, Inventory, ProductVariant
from apps.catalog.services import (
    CatalogService,
    FacetService,
    RecommendationService,
    BrandService,
)

User = get_user_model()


class CatalogServiceTests(TestCase):
    """Test CatalogService product queries, serialization, and mutations."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="merchant@perfumebooth.com",
            password="SecureMerchantPassword123!",
            first_name="Admin",
            last_name="Merchant"
        )
        self.p1 = Product.objects.create(
            title="Aventus Creed",
            slug="aventus-creed",
            sku="CREED-AV-100",
            price=Decimal("15000.00"),
            is_online=True,
            attributes={
                "brand": "Creed",
                "category": "Luxury",
                "gender": "Men",
                "productType": "Eau de Parfum",
                "top_notes": "Bergamot, Blackcurrant",
                "middle_notes": "Birch, Patchouli",
                "base_notes": "Oakmoss, Ambergris",
            }
        )
        Inventory.objects.create(product=self.p1, stock_level=15)

        self.p2 = Product.objects.create(
            title="Sauvage Dior",
            slug="sauvage-dior",
            sku="DIOR-SA-100",
            price=Decimal("9500.00"),
            is_online=True,
            attributes={
                "brand": "Dior",
                "category": "Designer",
                "gender": "Men",
                "productType": "Eau de Toilette",
                "top_notes": "Bergamot, Pepper",
                "middle_notes": "Lavender, Pink Pepper",
                "base_notes": "Cedar, Ambroxan",
            }
        )
        Inventory.objects.create(product=self.p2, stock_level=5)  # Low stock (<= 10)

        self.p3_offline = Product.objects.create(
            title="Draft Fragrance",
            slug="draft-fragrance",
            sku="DRAFT-01",
            price=Decimal("3000.00"),
            is_online=False,
            attributes={"brand": "Creed"}
        )
        Inventory.objects.create(product=self.p3_offline, stock_level=0)  # Out of stock

    def test_serialize_product(self):
        serialized = CatalogService.serialize_product(self.p1)
        self.assertEqual(serialized['id'], str(self.p1.id))
        self.assertEqual(serialized['title'], "Aventus Creed")
        self.assertEqual(serialized['slug'], "aventus-creed")
        self.assertEqual(serialized['sku'], "CREED-AV-100")
        self.assertEqual(serialized['price'], "15000.00")
        self.assertEqual(serialized['brand'], "Creed")
        self.assertEqual(serialized['gender'], "Men")
        self.assertEqual(serialized['stock'], 15)
        self.assertTrue(serialized['is_online'])

    def test_get_products_online_filtering(self):
        # Non-merchant should only see online products (p1, p2)
        products = CatalogService.get_products(is_merchant=False)
        slugs = [p['slug'] for p in products]
        self.assertIn("aventus-creed", slugs)
        self.assertIn("sauvage-dior", slugs)
        self.assertNotIn("draft-fragrance", slugs)

        # Merchant requesting status 'offline' should see p3_offline
        merchant_offline = CatalogService.get_products(is_merchant=True, status_filter='offline')
        offline_slugs = [p['slug'] for p in merchant_offline]
        self.assertIn("draft-fragrance", offline_slugs)
        self.assertNotIn("aventus-creed", offline_slugs)

    def test_get_products_search(self):
        # Search by title
        results = CatalogService.get_products(search_query="Aventus")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['slug'], "aventus-creed")

        # Search by SKU
        sku_results = CatalogService.get_products(search_query="DIOR-SA")
        self.assertEqual(len(sku_results), 1)
        self.assertEqual(sku_results[0]['slug'], "sauvage-dior")

    def test_get_products_brand_filter(self):
        results = CatalogService.get_products(brand="Dior")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['brand'], "Dior")

    def test_get_products_stock_status_filter(self):
        # Low stock filter (stock > 0 and <= 10) -> p2 has 5
        low_stock = CatalogService.get_products(stock_status='low')
        slugs = [p['slug'] for p in low_stock]
        self.assertIn("sauvage-dior", slugs)
        self.assertNotIn("aventus-creed", slugs)

    def test_get_products_pagination(self):
        paginated = CatalogService.get_products(paginate=True, page=1, page_size=1)
        self.assertIn('results', paginated)
        self.assertIn('total_count', paginated)
        self.assertEqual(len(paginated['results']), 1)
        self.assertEqual(paginated['page'], 1)
        self.assertEqual(paginated['page_size'], 1)

    def test_get_product_by_slug(self):
        data = CatalogService.get_product_by_slug("aventus-creed")
        self.assertIsNotNone(data)
        self.assertEqual(data['title'], "Aventus Creed")

        not_found = CatalogService.get_product_by_slug("non-existent-perfume")
        self.assertIsNone(not_found)

    def test_bulk_patch_products_online_status(self):
        success, message, count = CatalogService.bulk_patch_products(
            slugs=["aventus-creed", "sauvage-dior"],
            patch_data={"is_online": False}
        )
        self.assertTrue(success)
        self.assertEqual(count, 2)

        self.p1.refresh_from_db()
        self.assertFalse(self.p1.is_online)

    def test_bulk_patch_products_stock(self):
        success, message, count = CatalogService.bulk_patch_products(
            slugs=["aventus-creed"],
            patch_data={"stock_adjustment": {"action": "set", "value": 50}}
        )
        self.assertTrue(success)
        inv = Inventory.objects.get(product=self.p1)
        self.assertEqual(inv.stock_level, 50)


class FacetServiceTests(TestCase):
    """Test dynamic facet extraction and aggregation."""

    def setUp(self):
        Product.objects.create(
            title="Club de Nuit Intense",
            slug="club-de-nuit-intense",
            sku="ARMAF-CDNI",
            price=Decimal("2500.00"),
            is_online=True,
            attributes={
                "brand": "Armaf",
                "category": "Eau de Parfum",
                "gender": "Men",
                "productType": "Perfume",
                "occasion": "Evening",
                "season": "Winter",
                "tags": ["smoky", "citrus", "fruity"]
            }
        )
        Product.objects.create(
            title="Sillage",
            slug="armaf-sillage",
            sku="ARMAF-SIL",
            price=Decimal("2400.00"),
            is_online=True,
            attributes={
                "brand": "Armaf",
                "category": "Eau de Parfum",
                "gender": "Unisex",
                "productType": "Perfume",
                "occasion": "Daily",
                "season": "Summer",
                "tags": ["metallic", "fresh"]
            }
        )

    def test_get_facets_aggregations(self):
        facets = FacetService.get_facets(force_refresh=True)

        self.assertIn('brands', facets)
        self.assertIn('genders', facets)
        self.assertIn('categories', facets)
        self.assertIn('tags', facets)

        # Check brands facet
        brand_names = [b['value'] for b in facets['brands']]
        self.assertIn("Armaf", brand_names)

        # Check gender facet
        gender_names = [g['value'] for g in facets['genders']]
        self.assertIn("Men", gender_names)
        self.assertIn("Unisex", gender_names)

        # Check tags
        self.assertIn("smoky", facets['tags'])
        self.assertIn("fresh", facets['tags'])


class RecommendationServiceTests(TestCase):
    """Test scent similarity and fragrance recommendation ranking."""

    def setUp(self):
        self.base = Product.objects.create(
            title="Bleu Royal",
            slug="bleu-royal",
            sku="BLEU-01",
            price=Decimal("4000.00"),
            is_online=True,
            description="A fresh citrus and woody fragrance with cedar notes",
            attributes={
                "gender": "Men",
                "category": "Fresh",
                "top_notes": "Lemon, Grapefruit, Mint",
                "middle_notes": "Ginger, Nutmeg, Jasmine",
                "base_notes": "Cedar, Sandalwood, Patchouli",
            }
        )

        # Highly similar: shares citrus & cedar notes, same gender & category
        self.similar = Product.objects.create(
            title="Citrus Cedar Pour Homme",
            slug="citrus-cedar-pour-homme",
            sku="CITRUS-02",
            price=Decimal("3800.00"),
            is_online=True,
            description="Crisp lemon and cedar for modern gentlemen",
            attributes={
                "gender": "Men",
                "category": "Fresh",
                "top_notes": "Lemon, Mint",
                "middle_notes": "Ginger",
                "base_notes": "Cedar, Sandalwood",
            }
        )

        # Dissimilar: oriental vanilla and amber, different gender
        self.dissimilar = Product.objects.create(
            title="Sweet Vanilla Amber",
            slug="sweet-vanilla-amber",
            sku="VAN-03",
            price=Decimal("4200.00"),
            is_online=True,
            description="Warm oriental vanilla amber gourmand",
            attributes={
                "gender": "Women",
                "category": "Gourmand",
                "top_notes": "Caramel, Sugar",
                "middle_notes": "Vanilla Orchid",
                "base_notes": "Amber, Tonka Bean",
            }
        )

    def test_recommendations_ranking(self):
        recs = RecommendationService.get_recommendations("bleu-royal", limit=6)
        self.assertGreaterEqual(len(recs), 1)

        # Highly similar product should be ranked first
        self.assertEqual(recs[0]['slug'], "citrus-cedar-pour-homme")
        # Target product itself must NOT be in the recommendations
        rec_slugs = [r['slug'] for r in recs]
        self.assertNotIn("bleu-royal", rec_slugs)


class BrandServiceTests(TestCase):
    """Test BrandService load, save, and delete."""

    def test_load_and_save_brand(self):
        initial_brands = BrandService.load_brands()
        self.assertIsInstance(initial_brands, list)

        # Save a unique test brand
        test_brand = "Maison Francis Kurkdjian"
        updated_brands = BrandService.save_brand(test_brand)
        self.assertIn(test_brand, updated_brands)

        # Test brand update/rename
        BrandService.save_brand("Original Brand")
        renamed_brands = BrandService.update_brand("Original Brand", "Renamed Brand")
        self.assertIn("Renamed Brand", renamed_brands)
        self.assertNotIn("Original Brand", renamed_brands)
        BrandService.delete_brand("Renamed Brand")

        # Clean up
        cleaned = BrandService.delete_brand(test_brand)
        self.assertNotIn(test_brand, cleaned)


class CatalogAPITests(TestCase):
    """Test versioned and legacy API endpoints for catalog."""

    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            title="Oud Wood",
            slug="oud-wood",
            sku="TF-OUD-50",
            price=Decimal("18000.00"),
            is_online=True,
            attributes={
                "brand": "Tom Ford",
                "gender": "Unisex",
                "category": "Woody"
            }
        )
        Inventory.objects.create(product=self.product, stock_level=8)

    def test_v1_catalog_products_endpoint(self):
        resp = self.client.get('/api/v1/catalog/products/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        json_data = resp.json()
        self.assertIn('data', json_data)
        self.assertIn('meta', json_data)
        products = json_data['data']
        self.assertIsInstance(products, list)
        self.assertTrue(any(p['slug'] == 'oud-wood' for p in products))

    def test_v1_catalog_product_detail_endpoint(self):
        resp = self.client.get('/api/v1/catalog/products/oud-wood/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        json_data = resp.json()
        self.assertIn('data', json_data)
        data = json_data['data']
        self.assertEqual(data['title'], "Oud Wood")
        self.assertEqual(data['brand'], "Tom Ford")

    def test_v1_catalog_facets_endpoint(self):
        resp = self.client.get('/api/v1/catalog/facets/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        json_data = resp.json()
        self.assertIn('data', json_data)
        self.assertIn('brands', json_data['data'])

    def test_v1_catalog_brands_endpoint(self):
        resp = self.client.get('/api/v1/catalog/brands/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_legacy_shop_endpoints_remain_accessible(self):
        # Legacy /api/shop/products/
        resp = self.client.get('/api/shop/products/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Legacy /api/shop/facets/
        resp_facets = self.client.get('/api/shop/facets/')
        self.assertEqual(resp_facets.status_code, status.HTTP_200_OK)

        # Legacy /api/shop/brands/
        resp_brands = self.client.get('/api/shop/brands/')
        self.assertEqual(resp_brands.status_code, status.HTTP_200_OK)
