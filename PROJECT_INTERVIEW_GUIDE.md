# PerfumeBooth — Backend & Frontend Interview Guide

Prepared: 29 October 2026.

## How to use this guide

Each row gives one topic, a one-line interview explanation, and its actual code location. Paths are relative to the project root, `D:/Full-Perfumebooth`. This is a code map, not a claim that every feature has passed live production testing.

## Project introduction — interview answer

“I built a single-business fragrance commerce platform with a Next.js customer storefront, a separate Next.js merchant portal, and a modular Django REST backend. PostgreSQL holds authoritative commerce records, while Redis and Celery support background processing. The system includes catalog management, checkout, payments, inventory, CMS, notifications and reporting, with adapters for external services.”

## System and request flow

```text
Customer storefront / Merchant portal
                 |
       Next.js adapters / proxies
                 |
       Django API + authentication
                 |
       Domain services + validation
                 |
             PostgreSQL
                 |
     Deferred work -> Celery + Redis
                 |
     Payments / shipping / email / analytics
```

Typical read: storefront -> catalog adapter -> Django catalog API -> ORM -> normalized product response -> React UI.
Typical write: merchant form -> API client -> authorization and validation -> domain service -> database update -> follow-up jobs where needed.


## Backend architecture and core concepts

| Topic | One-line interview explanation | Where used |
| --- | --- | --- |
| Modular monolith | One Django application separates commerce responsibilities into domain apps without operating independent microservices. | [`perfumebooth-backend/apps`](<perfumebooth-backend/apps>) |
| HTTP routing | URL configuration directs incoming requests to the appropriate API view. | [`perfumebooth-backend/core/urls.py`](<perfumebooth-backend/core/urls.py>) |
| API versioning | A versioned routing module provides an explicit API evolution boundary. | [`perfumebooth-backend/core/v1_urls.py`](<perfumebooth-backend/core/v1_urls.py>) |
| REST APIs | Django REST Framework views expose catalog and commerce operations to both frontends. | [`perfumebooth-backend/apps/catalog/views.py`](<perfumebooth-backend/apps/catalog/views.py>) |
| Request lifecycle | Requests pass through middleware, authentication, views and domain services before receiving a response. | [`perfumebooth-backend/core/middleware.py`](<perfumebooth-backend/core/middleware.py>) |
| Business/service layer | Catalog rules and serialization live in a service instead of being repeated in frontend pages. | [`perfumebooth-backend/apps/catalog/services/catalog_service.py`](<perfumebooth-backend/apps/catalog/services/catalog_service.py>) |
| Data access layer | Django ORM models and querysets provide database access; this project does not require a separate repository abstraction. | [`perfumebooth-backend/apps/shop/models.py`](<perfumebooth-backend/apps/shop/models.py>) |
| Relational database | PostgreSQL stores authoritative products, customers, orders and other commerce records. | [`perfumebooth-backend/core/settings.py`](<perfumebooth-backend/core/settings.py>) |
| Schema migrations | Versioned Django migrations evolve database tables while preserving existing records. | [`perfumebooth-backend/apps/shop/migrations`](<perfumebooth-backend/apps/shop/migrations>) |
| Flexible attributes | Product JSON attributes hold fragrance-specific metadata alongside relational fields. | [`perfumebooth-backend/apps/shop/models.py`](<perfumebooth-backend/apps/shop/models.py>) |
| Authentication | Staff login and logout establish or terminate backend authentication state. | [`perfumebooth-backend/apps/authentication/views.py`](<perfumebooth-backend/apps/authentication/views.py>) |
| Customer authentication | Customer account endpoints implement customer-specific login and recovery flows. | [`perfumebooth-backend/apps/authentication/customer_views.py`](<perfumebooth-backend/apps/authentication/customer_views.py>) |
| Authorization | Authentication helpers centralize staff access checks and audit-related utilities. | [`perfumebooth-backend/apps/authentication/helpers.py`](<perfumebooth-backend/apps/authentication/helpers.py>) |
| CSRF and CORS | Backend settings configure cross-origin access and browser request security separately. | [`perfumebooth-backend/core/settings.py`](<perfumebooth-backend/core/settings.py>) |
| Input validation | Reusable validators reject invalid input, including unsuitable image uploads. | [`perfumebooth-backend/core/validators.py`](<perfumebooth-backend/core/validators.py>) |
| Checkout validation | Checkout-specific validation checks input before order creation. | [`perfumebooth-backend/apps/checkout/validators.py`](<perfumebooth-backend/apps/checkout/validators.py>) |
| Error handling | Shared exception handling gives API failures a consistent representation. | [`perfumebooth-backend/core/exceptions.py`](<perfumebooth-backend/core/exceptions.py>) |
| Response contract | The shared JSON renderer standardizes API response envelopes. | [`perfumebooth-backend/core/responses.py`](<perfumebooth-backend/core/responses.py>) |
| Pagination | Shared pagination limits the amount of data returned per API page. | [`perfumebooth-backend/core/pagination.py`](<perfumebooth-backend/core/pagination.py>) |
| Rate limiting | Throttle classes restrict request frequency for protected API operations. | [`perfumebooth-backend/core/throttling.py`](<perfumebooth-backend/core/throttling.py>) |
| Money precision | Shared monetary utilities avoid ordinary floating-point arithmetic for financial calculations. | [`perfumebooth-backend/core/money.py`](<perfumebooth-backend/core/money.py>) |
| Request tracing | Middleware supplies request context for tracing API activity. | [`perfumebooth-backend/core/middleware.py`](<perfumebooth-backend/core/middleware.py>) |
| Failure boundaries | Circuit-breaker utilities isolate repeated downstream service failures where integrated. | [`perfumebooth-backend/core/circuit_breaker.py`](<perfumebooth-backend/core/circuit_breaker.py>) |
| Configuration | Environment-driven settings separate configuration and secrets from application code. | [`perfumebooth-backend/core/settings.py`](<perfumebooth-backend/core/settings.py>) |
| Background processing | Celery executes deferred tasks outside the customer request lifecycle. | [`perfumebooth-backend/core/celery.py`](<perfumebooth-backend/core/celery.py>) |
| Dependency management | Python requirements declare the backend libraries and supported version ranges. | [`perfumebooth-backend/requirements.txt`](<perfumebooth-backend/requirements.txt>) |
| WSGI serving | The WSGI entry point allows a production server such as Gunicorn to run Django. | [`perfumebooth-backend/core/wsgi.py`](<perfumebooth-backend/core/wsgi.py>) |
| ASGI entry point | An ASGI entry point exists, but does not by itself prove WebSocket functionality. | [`perfumebooth-backend/core/asgi.py`](<perfumebooth-backend/core/asgi.py>) |

## Backend commerce domains

| Topic | One-line interview explanation | Where used |
| --- | --- | --- |
| Products and variants | Product and variant models represent sellable catalog items and their options. | [`perfumebooth-backend/apps/shop/models.py`](<perfumebooth-backend/apps/shop/models.py>) |
| Catalog serialization | The catalog service converts database records into the storefront's expected product shape. | [`perfumebooth-backend/apps/catalog/services/catalog_service.py`](<perfumebooth-backend/apps/catalog/services/catalog_service.py>) |
| Product search | Current catalog search uses weighted ORM text matching across titles, SKUs, brands and fragrance attributes. | [`perfumebooth-backend/apps/catalog/services/catalog_service.py`](<perfumebooth-backend/apps/catalog/services/catalog_service.py>) |
| Vector support | A product embedding field provides pgvector storage support; its presence is not proof of active semantic search. | [`perfumebooth-backend/apps/shop/models.py`](<perfumebooth-backend/apps/shop/models.py>) |
| Recommendations | Fragrance recommendations use token-overlap similarity with gender and category boosts. | [`perfumebooth-backend/apps/catalog/services/recommendation_service.py`](<perfumebooth-backend/apps/catalog/services/recommendation_service.py>) |
| Faceted filtering | The facet service derives filtering choices from catalog data. | [`perfumebooth-backend/apps/catalog/services/facet_service.py`](<perfumebooth-backend/apps/catalog/services/facet_service.py>) |
| Brand management | The brand service handles brand-related catalog operations. | [`perfumebooth-backend/apps/catalog/services/brand_service.py`](<perfumebooth-backend/apps/catalog/services/brand_service.py>) |
| Collection membership | Shared membership rules determine which published products belong in manual or dynamic collections. | [`perfumebooth-backend/apps/shop/collection_membership.py`](<perfumebooth-backend/apps/shop/collection_membership.py>) |
| Category normalization | Category utilities normalize imported taxonomy into usable fragrance categories. | [`perfumebooth-backend/apps/shop/category_utils.py`](<perfumebooth-backend/apps/shop/category_utils.py>) |
| Bulk product imports | The importer matches product identities and applies supported spreadsheet updates. | [`perfumebooth-backend/apps/shop/product_imports.py`](<perfumebooth-backend/apps/shop/product_imports.py>) |
| Selective updates | Selective-import tests cover updating supplied fields without replacing unrelated product data. | [`perfumebooth-backend/apps/shop/tests/test_selective_product_import.py`](<perfumebooth-backend/apps/shop/tests/test_selective_product_import.py>) |
| Advanced bulk operations | Advanced import logic handles bulk transformations, schedules, mappings and snapshot-related operations. | [`perfumebooth-backend/apps/shop/advanced_imports.py`](<perfumebooth-backend/apps/shop/advanced_imports.py>) |
| Import templates | Template generation supplies supported columns for catalog import workflows. | [`perfumebooth-backend/apps/shop/product_import_template.py`](<perfumebooth-backend/apps/shop/product_import_template.py>) |
| Image ingestion | Image import logic processes external image sources for catalog imports. | [`perfumebooth-backend/apps/shop/image_imports.py`](<perfumebooth-backend/apps/shop/image_imports.py>) |
| Native reviews | Product review records live in the platform rather than requiring an external review widget. | [`perfumebooth-backend/apps/shop/models.py`](<perfumebooth-backend/apps/shop/models.py>) |
| Legacy review migration | Review import logic brings historical reviews into native records. | [`perfumebooth-backend/apps/shop/review_imports.py`](<perfumebooth-backend/apps/shop/review_imports.py>) |
| Checkout orchestration | The checkout service coordinates validated pricing, inventory and order creation. | [`perfumebooth-backend/apps/checkout/services/checkout_service.py`](<perfumebooth-backend/apps/checkout/services/checkout_service.py>) |
| Server-side pricing | Pricing is calculated by backend logic rather than trusting browser totals. | [`perfumebooth-backend/apps/checkout/services/pricing_service.py`](<perfumebooth-backend/apps/checkout/services/pricing_service.py>) |
| Stock reservations | Reservation records temporarily allocate stock during the purchasing lifecycle. | [`perfumebooth-backend/apps/inventory/models.py`](<perfumebooth-backend/apps/inventory/models.py>) |
| Inventory movements | Inventory movement records capture stock changes for traceability. | [`perfumebooth-backend/apps/inventory/models.py`](<perfumebooth-backend/apps/inventory/models.py>) |
| Inventory concurrency | Inventory services coordinate stock mutations and reservations to protect availability. | [`perfumebooth-backend/apps/inventory/services.py`](<perfumebooth-backend/apps/inventory/services.py>) |
| Reservation cleanup | Inventory background tasks support reservation lifecycle processing. | [`perfumebooth-backend/apps/inventory/tasks.py`](<perfumebooth-backend/apps/inventory/tasks.py>) |
| Orders | Order models store purchase records and their related commerce state. | [`perfumebooth-backend/apps/orders/models.py`](<perfumebooth-backend/apps/orders/models.py>) |
| Order business rules | Order services coordinate domain operations outside HTTP handlers. | [`perfumebooth-backend/apps/orders/services.py`](<perfumebooth-backend/apps/orders/services.py>) |
| Promotions and coupons | Promotion logic evaluates discount rules and coupon eligibility. | [`perfumebooth-backend/apps/orders/promotions.py`](<perfumebooth-backend/apps/orders/promotions.py>) |
| Payment initialization | Payment services initialize gateway transactions against backend order state. | [`perfumebooth-backend/apps/orders/payments.py`](<perfumebooth-backend/apps/orders/payments.py>) |
| Idempotency | Payment initialization uses an idempotency key to handle repeated requests safely. | [`perfumebooth-backend/apps/orders/payments.py`](<perfumebooth-backend/apps/orders/payments.py>) |
| Payment verification | Payment verification checks provider evidence before advancing payment state. | [`perfumebooth-backend/apps/orders/payments.py`](<perfumebooth-backend/apps/orders/payments.py>) |
| Payment reconciliation | Reconciliation retrieves provider state to resolve incomplete local payment attempts. | [`perfumebooth-backend/apps/orders/payments.py`](<perfumebooth-backend/apps/orders/payments.py>) |
| Payment ledger | Ledger logic records payment-related financial events for reporting and reconciliation. | [`perfumebooth-backend/apps/orders/payment_ledger.py`](<perfumebooth-backend/apps/orders/payment_ledger.py>) |
| Deferred order side effects | Order tasks process follow-up work separately from synchronous checkout. | [`perfumebooth-backend/apps/orders/tasks.py`](<perfumebooth-backend/apps/orders/tasks.py>) |
| Shipping integration | Shiprocket integration translates local fulfillment operations into provider API calls. | [`perfumebooth-backend/apps/orders/shiprocket.py`](<perfumebooth-backend/apps/orders/shiprocket.py>) |
| Customer addresses | Address endpoints and ownership rules keep customer address operations scoped to their owner. | [`perfumebooth-backend/apps/authentication/customer_views.py`](<perfumebooth-backend/apps/authentication/customer_views.py>) |
| CMS data models | CMS models store editable pages, sections, blogs and media metadata. | [`perfumebooth-backend/apps/cms/models.py`](<perfumebooth-backend/apps/cms/models.py>) |
| CMS APIs | CMS views expose content administration and storefront consumption. | [`perfumebooth-backend/apps/cms/views.py`](<perfumebooth-backend/apps/cms/views.py>) |
| Media storage | Storage configuration selects local media or Cloudflare R2 through S3-compatible storage. | [`perfumebooth-backend/core/settings.py`](<perfumebooth-backend/core/settings.py>) |
| Newsletter and restock notifications | Notification services implement subscription and out-of-stock notification workflows. | [`perfumebooth-backend/apps/cms/notifications.py`](<perfumebooth-backend/apps/cms/notifications.py>) |
| Notification delivery jobs | CMS tasks run notification work asynchronously. | [`perfumebooth-backend/apps/cms/tasks.py`](<perfumebooth-backend/apps/cms/tasks.py>) |
| Historical content import | The legacy blog command imports published content into the native CMS. | [`perfumebooth-backend/apps/cms/management/commands/import_legacy_blogs.py`](<perfumebooth-backend/apps/cms/management/commands/import_legacy_blogs.py>) |

## Analytics and reporting

| Topic | One-line interview explanation | Where used |
| --- | --- | --- |
| Event storage | Analytics models store first-party event and attribution records. | [`perfumebooth-backend/apps/analytics/models.py`](<perfumebooth-backend/apps/analytics/models.py>) |
| Event ingestion | Ingestion logic validates and processes incoming analytics events. | [`perfumebooth-backend/apps/analytics/ingestion.py`](<perfumebooth-backend/apps/analytics/ingestion.py>) |
| Asynchronous analytics | Analytics tasks process events and scheduled provider/reporting work. | [`perfumebooth-backend/apps/analytics/tasks.py`](<perfumebooth-backend/apps/analytics/tasks.py>) |
| First-party reports | Report builders aggregate the platform's own analytics data. | [`perfumebooth-backend/apps/analytics/reports.py`](<perfumebooth-backend/apps/analytics/reports.py>) |
| Provider adapters | Provider integration code separates external analytics APIs from local reporting. | [`perfumebooth-backend/apps/analytics/providers.py`](<perfumebooth-backend/apps/analytics/providers.py>) |
| External-provider reports | Provider reports expose data obtained through configured analytics integrations. | [`perfumebooth-backend/apps/analytics/provider_reports.py`](<perfumebooth-backend/apps/analytics/provider_reports.py>) |
| Campaign performance | Campaign report logic combines attribution and campaign data for marketing reporting. | [`perfumebooth-backend/apps/analytics/campaign_reports.py`](<perfumebooth-backend/apps/analytics/campaign_reports.py>) |
| Commerce reporting | Shop reporting derives business metrics from backend commerce records. | [`perfumebooth-backend/apps/shop/reporting.py`](<perfumebooth-backend/apps/shop/reporting.py>) |
| Report catalog | A central catalog organizes report definitions and date/source limits. | [`perfumebooth-backend/apps/shop/report_catalog.py`](<perfumebooth-backend/apps/shop/report_catalog.py>) |
| Customer analysis | Customer reports implement customer-focused aggregations. | [`perfumebooth-backend/apps/shop/customer_reports.py`](<perfumebooth-backend/apps/shop/customer_reports.py>) |
| Financial reports | Transaction reports expose payment and transaction-related reporting. | [`perfumebooth-backend/apps/shop/transaction_reports.py`](<perfumebooth-backend/apps/shop/transaction_reports.py>) |
| Reporting endpoints | Report views expose report results to the merchant portal. | [`perfumebooth-backend/apps/shop/report_views.py`](<perfumebooth-backend/apps/shop/report_views.py>) |

## Storefront frontend topics

| Topic | One-line interview explanation | Where used |
| --- | --- | --- |
| Next.js App Router | File-based routes organize storefront pages, layouts and API handlers. | [`perfumebooth/src/app`](<perfumebooth/src/app>) |
| React components | Reusable components separate page composition from interactive UI pieces. | [`perfumebooth/src/components`](<perfumebooth/src/components>) |
| TypeScript contracts | Backend types describe data structures consumed by the storefront. | [`perfumebooth/src/lib/backend/types.ts`](<perfumebooth/src/lib/backend/types.ts>) |
| Global layout | The root layout composes shared application structure around page content. | [`perfumebooth/src/app/layout.tsx`](<perfumebooth/src/app/layout.tsx>) |
| Server-side page composition | The homepage assembles backend-driven sections before delivering its initial page. | [`perfumebooth/src/app/page.tsx`](<perfumebooth/src/app/page.tsx>) |
| Backend facade | The catalog facade gives UI code a common entry point to Django-backed catalog data. | [`perfumebooth/src/lib/catalog.ts`](<perfumebooth/src/lib/catalog.ts>) |
| Product mapping | Backend product adapters normalize API records into frontend product models. | [`perfumebooth/src/lib/backend/products.ts`](<perfumebooth/src/lib/backend/products.ts>) |
| Collection fetching | Collection adapters retrieve collections and support legacy handle compatibility. | [`perfumebooth/src/lib/backend/collections.ts`](<perfumebooth/src/lib/backend/collections.ts>) |
| Collection query logic | Shared query logic applies collection filtering and related selection behavior. | [`perfumebooth/src/lib/backend/collection-query.ts`](<perfumebooth/src/lib/backend/collection-query.ts>) |
| Content fetching | Content adapters retrieve CMS pages and blog content from Django. | [`perfumebooth/src/lib/backend/content.ts`](<perfumebooth/src/lib/backend/content.ts>) |
| Customer API adapter | Customer helpers isolate account-related backend communication. | [`perfumebooth/src/lib/backend/customer.ts`](<perfumebooth/src/lib/backend/customer.ts>) |
| Server Actions | Authentication actions perform account operations at the Next.js server boundary. | [`perfumebooth/src/lib/actions/auth.ts`](<perfumebooth/src/lib/actions/auth.ts>) |
| API route handlers | Next.js API routes provide same-origin endpoints for browser interactions. | [`perfumebooth/src/app/api`](<perfumebooth/src/app/api>) |
| Checkout proxy | Checkout route handlers relay supported payment operations to backend services. | [`perfumebooth/src/app/api/checkout`](<perfumebooth/src/app/api/checkout>) |
| Cart validation | The cart validation endpoint checks browser cart state against backend rules. | [`perfumebooth/src/app/api/cart/validate/route.ts`](<perfumebooth/src/app/api/cart/validate/route.ts>) |
| Coupon application | The cart coupon endpoint connects checkout UI to backend coupon evaluation. | [`perfumebooth/src/app/api/cart/coupon/route.ts`](<perfumebooth/src/app/api/cart/coupon/route.ts>) |
| Client state with Zustand | The cart store coordinates cart state across components. | [`perfumebooth/src/store/useCartStore.ts`](<perfumebooth/src/store/useCartStore.ts>) |
| Authentication UI state | The auth store shares customer authentication state across the UI. | [`perfumebooth/src/store/useAuthStore.ts`](<perfumebooth/src/store/useAuthStore.ts>) |
| Wishlist state | The wishlist store coordinates saved-product interaction state. | [`perfumebooth/src/store/useWishlist.ts`](<perfumebooth/src/store/useWishlist.ts>) |
| Product comparison | The compare store shares selected products across comparison interfaces. | [`perfumebooth/src/store/useCompareStore.ts`](<perfumebooth/src/store/useCompareStore.ts>) |
| Recently viewed products | The recent-products store tracks browsing-related product state. | [`perfumebooth/src/store/useRecentStore.ts`](<perfumebooth/src/store/useRecentStore.ts>) |
| Hydration | Client hydrators restore or synchronize browser state after initial server rendering. | [`perfumebooth/src/components/layout/ClientSideHydrators.tsx`](<perfumebooth/src/components/layout/ClientSideHydrators.tsx>) |
| Product availability | Availability helpers provide consistent stock-aware product display decisions. | [`perfumebooth/src/lib/catalog-availability.ts`](<perfumebooth/src/lib/catalog-availability.ts>) |
| Collection page composition | CollectionTemplate combines collection products, banners and filter presentation. | [`perfumebooth/src/components/product/CollectionTemplate.tsx`](<perfumebooth/src/components/product/CollectionTemplate.tsx>) |
| Filter contracts | Shared catalog filters keep selection rules consistent across product browsing. | [`perfumebooth/src/lib/catalog-filters.ts`](<perfumebooth/src/lib/catalog-filters.ts>) |
| Homepage merchandising | TrendingSection requests collection products and selects items for its carousel. | [`perfumebooth/src/components/home/TrendingSection.tsx`](<perfumebooth/src/components/home/TrendingSection.tsx>) |
| Reusable carousel | ProductCarousel renders a reusable horizontal product presentation. | [`perfumebooth/src/components/home/ProductCarousel.tsx`](<perfumebooth/src/components/home/ProductCarousel.tsx>) |
| CMS rendering | CMSPageRenderer translates backend content structures into storefront UI. | [`perfumebooth/src/components/cms/CMSPageRenderer.tsx`](<perfumebooth/src/components/cms/CMSPageRenderer.tsx>) |
| Collection banner fallback | CollectionBanner chooses from CMS, collection and fallback banner sources. | [`perfumebooth/src/components/ui/CollectionBanner.tsx`](<perfumebooth/src/components/ui/CollectionBanner.tsx>) |
| Search UI | SearchBar provides the customer-facing search interaction. | [`perfumebooth/src/components/search/SearchBar.tsx`](<perfumebooth/src/components/search/SearchBar.tsx>) |
| Media URL normalization | Media helpers normalize image locations used by frontend components. | [`perfumebooth/src/lib/media-url.ts`](<perfumebooth/src/lib/media-url.ts>) |
| Loading UI | App Router loading boundaries provide feedback while route content loads. | [`perfumebooth/src/app/loading.tsx`](<perfumebooth/src/app/loading.tsx>) |
| Error boundaries | Route error components provide a recoverable UI for rendering failures. | [`perfumebooth/src/app/error.tsx`](<perfumebooth/src/app/error.tsx>) |
| Global errors | The global error component handles failures affecting the root application boundary. | [`perfumebooth/src/app/global-error.tsx`](<perfumebooth/src/app/global-error.tsx>) |
| SEO sitemap | The sitemap route exposes discoverable site URLs to search crawlers. | [`perfumebooth/src/app/sitemap.ts`](<perfumebooth/src/app/sitemap.ts>) |
| Crawler directives | The robots route communicates crawler rules. | [`perfumebooth/src/app/robots.ts`](<perfumebooth/src/app/robots.ts>) |
| Consent-aware analytics | AnalyticsConsent provides the user-facing analytics consent control. | [`perfumebooth/src/components/layout/AnalyticsConsent.tsx`](<perfumebooth/src/components/layout/AnalyticsConsent.tsx>) |
| First-party tracking | Tracking helpers send supported behavioral events into the platform analytics pipeline. | [`perfumebooth/src/lib/first-party-analytics.ts`](<perfumebooth/src/lib/first-party-analytics.ts>) |
| Newsletter UI | NewsletterStrip connects storefront subscription interactions to notification workflows. | [`perfumebooth/src/components/layout/NewsletterStrip.tsx`](<perfumebooth/src/components/layout/NewsletterStrip.tsx>) |
| Reusable SVG icons | TSX icon components provide reusable vector UI graphics rather than raster icon files. | [`perfumebooth/src/components/ui/icons`](<perfumebooth/src/components/ui/icons>) |
| Styling | Global CSS supplies shared storefront styling alongside component-level styles. | [`perfumebooth/src/app/globals.css`](<perfumebooth/src/app/globals.css>) |

## Merchant portal frontend topics

| Topic | One-line interview explanation | Where used |
| --- | --- | --- |
| Admin route grouping | The dashboard route group organizes merchant pages under a shared layout. | [`perfumebooth-MPS/src/app/(dashboard)/layout.tsx`](<perfumebooth-MPS/src/app/(dashboard)/layout.tsx>) |
| Session-aware API client | The shared client sends credentials and CSRF information with admin API requests. | [`perfumebooth-MPS/src/lib/api.ts`](<perfumebooth-MPS/src/lib/api.ts>) |
| Staff login UI | The login page connects merchant authentication to backend sessions. | [`perfumebooth-MPS/src/app/(auth)/login/page.tsx`](<perfumebooth-MPS/src/app/(auth)/login/page.tsx>) |
| Auth state | The admin auth store shares merchant identity and session-related UI state. | [`perfumebooth-MPS/src/store/useAuthStore.ts`](<perfumebooth-MPS/src/store/useAuthStore.ts>) |
| Theme state | The theme store maintains merchant theme preferences. | [`perfumebooth-MPS/src/store/useThemeStore.ts`](<perfumebooth-MPS/src/store/useThemeStore.ts>) |
| Responsive navigation | ResponsiveSidebar adapts navigation to available screen space. | [`perfumebooth-MPS/src/components/ResponsiveSidebar.tsx`](<perfumebooth-MPS/src/components/ResponsiveSidebar.tsx>) |
| Products editor | The products page provides catalog administration. | [`perfumebooth-MPS/src/app/(dashboard)/products/page.tsx`](<perfumebooth-MPS/src/app/(dashboard)/products/page.tsx>) |
| Variant management | VariantManager edits product option and variant information. | [`perfumebooth-MPS/src/components/products/VariantManager.tsx`](<perfumebooth-MPS/src/components/products/VariantManager.tsx>) |
| Catalog import UI | CatalogImportModal provides the merchant interface for importing product data. | [`perfumebooth-MPS/src/components/products/CatalogImportModal.tsx`](<perfumebooth-MPS/src/components/products/CatalogImportModal.tsx>) |
| Advanced import controls | AdvancedImportControls exposes supported bulk-operation options. | [`perfumebooth-MPS/src/components/products/AdvancedImportControls.tsx`](<perfumebooth-MPS/src/components/products/AdvancedImportControls.tsx>) |
| Catalog export UI | CatalogExportModal allows merchants to request catalog exports. | [`perfumebooth-MPS/src/components/products/CatalogExportModal.tsx`](<perfumebooth-MPS/src/components/products/CatalogExportModal.tsx>) |
| Image batch UI | BatchImageDropzone handles batch image selection for product workflows. | [`perfumebooth-MPS/src/components/products/BatchImageDropzone.tsx`](<perfumebooth-MPS/src/components/products/BatchImageDropzone.tsx>) |
| Collection administration | Collections page manages collection rules, membership, images and SEO fields. | [`perfumebooth-MPS/src/app/(dashboard)/collections/page.tsx`](<perfumebooth-MPS/src/app/(dashboard)/collections/page.tsx>) |
| Inventory administration | Inventory page exposes merchant stock-management operations. | [`perfumebooth-MPS/src/app/(dashboard)/inventory/page.tsx`](<perfumebooth-MPS/src/app/(dashboard)/inventory/page.tsx>) |
| Order administration | Orders page presents order records for merchant operations. | [`perfumebooth-MPS/src/app/(dashboard)/orders/page.tsx`](<perfumebooth-MPS/src/app/(dashboard)/orders/page.tsx>) |
| Customer administration | Customers page provides access to customer records. | [`perfumebooth-MPS/src/app/(dashboard)/customers/page.tsx`](<perfumebooth-MPS/src/app/(dashboard)/customers/page.tsx>) |
| Coupon administration | Coupons page exposes merchant discount and coupon controls. | [`perfumebooth-MPS/src/app/(dashboard)/coupons/page.tsx`](<perfumebooth-MPS/src/app/(dashboard)/coupons/page.tsx>) |
| Review administration | Reviews page provides native review-management UI. | [`perfumebooth-MPS/src/app/(dashboard)/reviews/page.tsx`](<perfumebooth-MPS/src/app/(dashboard)/reviews/page.tsx>) |
| Analytics visualization | AnalyticsDashboard renders metric cards and charts from reporting responses. | [`perfumebooth-MPS/src/components/analytics/AnalyticsDashboard.tsx`](<perfumebooth-MPS/src/components/analytics/AnalyticsDashboard.tsx>) |
| Report browser | Reports page supports report selection, date filters and export interaction. | [`perfumebooth-MPS/src/app/(dashboard)/reports/page.tsx`](<perfumebooth-MPS/src/app/(dashboard)/reports/page.tsx>) |
| Rich text editor | CKEditorWrapper integrates rich-text authoring into the CMS interface. | [`perfumebooth-MPS/src/components/cms/CKEditorWrapper.tsx`](<perfumebooth-MPS/src/components/cms/CKEditorWrapper.tsx>) |
| Media picker | MediaLibraryModal lets content editors select existing media assets. | [`perfumebooth-MPS/src/components/cms/MediaLibraryModal.tsx`](<perfumebooth-MPS/src/components/cms/MediaLibraryModal.tsx>) |
| Staff administration | Staff settings page exposes staff-management controls. | [`perfumebooth-MPS/src/app/(dashboard)/settings/staff/page.tsx`](<perfumebooth-MPS/src/app/(dashboard)/settings/staff/page.tsx>) |

## Testing and operations

| Topic | One-line interview explanation | Where used |
| --- | --- | --- |
| Container orchestration | Docker Compose defines the local application services and their dependencies. | [`docker-compose.yml`](<docker-compose.yml>) |
| Backend packaging | The backend Dockerfile defines the backend container image. | [`perfumebooth-backend/Dockerfile`](<perfumebooth-backend/Dockerfile>) |
| Frontend dependencies | The storefront package manifest declares scripts and JavaScript dependency versions. | [`perfumebooth/package.json`](<perfumebooth/package.json>) |
| Admin dependencies | The MPS package manifest declares merchant UI scripts and dependency versions. | [`perfumebooth-MPS/package.json`](<perfumebooth-MPS/package.json>) |
| Search regression tests | Catalog search tests protect expected product ranking behavior. | [`perfumebooth-backend/apps/catalog/tests/test_search_ranking.py`](<perfumebooth-backend/apps/catalog/tests/test_search_ranking.py>) |
| Payment regression tests | Payment tests exercise payment workflow behavior without proving live gateway readiness. | [`perfumebooth-backend/apps/orders/tests/test_payments.py`](<perfumebooth-backend/apps/orders/tests/test_payments.py>) |
| Reservation tests | Inventory tests cover reservation-related domain behavior. | [`perfumebooth-backend/apps/inventory/tests/test_inventory_reservations.py`](<perfumebooth-backend/apps/inventory/tests/test_inventory_reservations.py>) |
| Authorization tests | Security tests cover authentication and security-sensitive account behavior. | [`perfumebooth-backend/apps/authentication/tests/test_penetration_and_security.py`](<perfumebooth-backend/apps/authentication/tests/test_penetration_and_security.py>) |
| Coupon security tests | Auth/coupon tests exercise restrictions that should not be trusted to frontend validation. | [`perfumebooth-backend/apps/orders/tests/test_auth_coupon_security.py`](<perfumebooth-backend/apps/orders/tests/test_auth_coupon_security.py>) |
| Bulk-operation tests | Advanced import tests cover supported batch-operation behavior. | [`perfumebooth-backend/apps/shop/tests/test_advanced_imports.py`](<perfumebooth-backend/apps/shop/tests/test_advanced_imports.py>) |
| Report tests | Report catalog tests exercise reporting definitions and expected responses. | [`perfumebooth-backend/apps/shop/tests/test_report_catalog.py`](<perfumebooth-backend/apps/shop/tests/test_report_catalog.py>) |
| Notification tests | Notification tests check subscription and delivery-related application behavior. | [`perfumebooth-backend/apps/cms/test_notifications.py`](<perfumebooth-backend/apps/cms/test_notifications.py>) |
| Project memory | The memory log records implementation work and remaining verification tasks, but is not an automated acceptance certificate. | [`memory.md`](<memory.md>) |

## Important distinctions for interviews

- **Single business, not marketplace:** do not describe vendor onboarding, commissions or vendor settlement as completed features.
- **Modular monolith, not microservices:** domain modules share one Django deployment and database; Celery workers are background processors, not independent commerce services.
- **Search is not Elasticsearch:** the inspected catalog path uses weighted text matching; an installed pgvector dependency and embedding field do not establish an active semantic-search pipeline.
- **Recommendations are currently rule-based:** the inspected recommendation service uses token overlap and affinity boosts, not a trained recommendation model.
- **Backend is authoritative:** browser cart state, displayed totals and analytics events do not independently establish payment, order or stock truth.
- **R2 files and database links differ:** uploading a media object does not automatically assign it to a collection image field or CMS banner.
- **Authentication and authorization differ:** authentication identifies the caller; authorization determines which actions that caller may perform.
- **CORS and CSRF differ:** CORS controls browser cross-origin access; CSRF protection addresses unwanted authenticated browser requests.
- **Idempotency is not “exactly once”:** it makes retries safe through identity/state checks; workers and providers can still deliver messages repeatedly.
- **Server rendering is not no JavaScript:** interactive client components still hydrate and use browser JavaScript.
- **Installed packages are not completed features:** dependency declarations alone do not prove runtime usage or production readiness.
- **Legacy code still exists:** migration helpers and legacy Shopify-related files remain; do not claim the repository contains no Shopify references.

## Integrations and readiness boundaries

| Area | Accurate statement |
| --- | --- |
| Razorpay | Payment integration code exists; production credentials, webhook configuration and end-to-end payment/refund tests still need environment-specific verification. |
| Shiprocket | Shipping integration exists; automatic processing requires eligible orders, configured credentials and running background processors. |
| Cloudflare R2 | S3-compatible media storage is configured in backend settings; every displayed asset still needs a valid file key and reachable URL. |
| SMTP/email | Notification code exists; verified sender configuration and successful real delivery must be checked separately. |
| GA4 and Search Console | Integration adapters/reporting code require appropriate account access, credentials and source data. |
| Google Ads and Meta Ads | Advertising reports require configured accounts and spend/attribution data before ROAS can be treated as actual. |
| First-party analytics | Consent and recorded events determine coverage; missing historical events cannot be reconstructed as observed traffic. |
| Reports | The inspected report catalog has date-range and source-record limits; do not claim unlimited reporting history or scale. |
| Collection display | Saved membership, publication, availability, route aliases and media assignments can each affect what customers see. |
| Production deployment | Code presence and earlier targeted tests are not a complete release sign-off; staging, restore tests, security and load checks remain separate. |

## Short interview questions and answers

| Question | One-line answer |
| --- | --- |
| Why two frontend apps? | Customers and staff have different workflows, so separate storefront and merchant interfaces share the same backend commerce rules. |
| Why a modular monolith? | It keeps deployment and transactions simpler while providing domain boundaries that can evolve later. |
| Why use services? | Services let API endpoints, jobs and commands reuse business rules without duplicating them. |
| Why PostgreSQL? | Commerce benefits from relational constraints, transactions and structured querying of linked records. |
| Why Celery? | Email, integrations and scheduled processing should not unnecessarily block customer-facing requests. |
| Why validate prices on the server? | Client-supplied prices can be stale or manipulated, so checkout must calculate trusted totals. |
| Why reserve stock? | A reservation prevents concurrent purchasing flows from treating the same available stock as independently sellable. |
| Why payment idempotency? | A retried payment request must not create a second independent purchase operation. |
| Why normalize API responses? | A shared contract reduces frontend coupling to database representation and makes errors predictable. |
| Why consent-aware analytics? | Behavioral tracking should respect customer choices and distinguish observed data from missing data. |
| What would you improve next? | Resolve known routing/data issues, verify production integrations, test restore/recovery paths and measure real performance before optimizing. |

## Verification scope for this document

This guide was prepared from repository structure and selected implementation files. Referenced file/directory paths were checked locally. No application behavior, database records, credentials or deployment configuration were changed, and no full application test suite was run for this documentation task.

