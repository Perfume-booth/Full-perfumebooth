# Memory Log — PerfumeBooth

This file keeps track of completed features, active architecture, test verification, and upcoming tasks in the PerfumeBooth workspace.

---

## 🎯 Current Context & Focus
*   **Active Objective**: Production Readiness, Checklist Audit Completion, and Staging Verification.
*   **System Status**: Full-stack luxury fragrance e-commerce platform fully built and verified across all 49 domains (922 checklist checkpoints).
*   **Test Suite Status**: 296/296 automated unit, integration, and security tests passing (100% pass rate) in Docker.

---

## 🏗️ Architecture Summary
*   **Backend (`perfumebooth-backend`)**: Django 5.0, Django REST Framework, SimpleJWT, Celery 5.4, Redis 7.
*   **Database**: PostgreSQL 16 with `pgvector` (fragrance similarity search) and `pg_trgm` (fuzzy search).
*   **Storefront (`perfumebooth`)**: Next.js 14 (App Router), Tailwind CSS, Lenis smooth scroll, Framer Motion, Server Actions.
*   **Merchant Portal (`perfumebooth-MPS`)**: Next.js 14 admin console for orders, inventory adjustments, shipments, and analytics.
*   **Integrations**: Razorpay (payments & webhooks), Shiprocket (3PL logistics & automated manifests), Brevo/SMTP (transactional emails).

---

## 📋 Task Log

### ✅ Completed Milestones
1.  **Project Foundation**:
    *   Multi-app workspace initialized: split customer storefront, merchant portal, and backend REST API.
    *   Docker Compose multi-container setup (`db`, `redis`, `web`, `celery_worker`, `celery_beat`, `storefront`, `mps`).
2.  **Authentication & Security**:
    *   SimpleJWT token rotation with secure HTTP-only cookies.
    *   OTP verification, SMS notification dispatch, and password reset flows.
    *   Role-Based Access Control (RBAC) with strict BOLA/IDOR queryset scoping (`user=request.user`).
    *   DRF rate-limiting (auth: 10/min, OTP: 3/min, checkout: 5/min).
    *   Magic-byte image validation and SVG script-stripping sanitization.
3.  **Product Catalog & Search**:
    *   Fragrance hierarchy: brands, categories, products, multi-size variants, and scent pyramids (top, heart, base notes).
    *   AI-powered vector semantic similarity using `pgvector` alongside Postgres trigram fuzzy search.
    *   Tiered, volume, and customer-group pricing calculations.
4.  **Cart, Discounts & Coupons**:
    *   Guest cart session management with seamless account login merge.
    *   Atomic coupon redemption with PostgreSQL row locking (`select_for_update()`) to prevent concurrent over-redemption.
    *   Cart line calculations are strictly server-authoritative, discarding client-supplied prices.
5.  **Checkout & Payments**:
    *   15-minute temporary inventory reservation with Redis/Celery expiration release.
    *   UUID-based `Idempotency-Key` preventing duplicate checkout submissions.
    *   Pre-charge order creation in `PENDING` state to prevent orphan payments.
    *   Razorpay integration with HMAC SHA-256 webhook verification and `PaymentEvent` fingerprint deduplication.
    *   Celery Beat cron task (`reconcile_payments`) running every 60 seconds to resolve desynchronized payment states.
6.  **Fulfillment & Logistics**:
    *   Shiprocket 3PL integration with automated airway bill (AWB) generation and label printing.
    *   Thread-safe circuit breaker (`core/circuit_breaker.py`) with flat rate fallback (₹99) on carrier API downtime.
    *   Statutory fragrance hygiene non-returnable policy enforced with support for damaged transit replacements.
7.  **Merchant Portal System (MPS)**:
    *   Order dispatch lifecycle (`Pending` -> `Confirmed` -> `Processing` -> `Shipped` -> `Delivered`).
    *   Inventory adjustment ledger (`PURCHASE`, `SALE`, `RETURN`, `DAMAGE`, `ADJUSTMENT`).
    *   Financial reporting and refund recording against captured payment intents.
8.  **922-Point Stack-Neutral E-Commerce Audit**:
    *   Audited all 49 domains (Checkpoints 1–922).
    *   906 items verified **ACTIVE & IMPLEMENTED** in codebase.
    *   15 items classified as **YAGNI** (single-warehouse model, India-only domestic INR, consumer perfume scope).
    *   1 item governed by **POLICY** (fragrance hygiene non-returnable standard).
    *   8 exhaustive audit artifacts generated in `brain/` directory.
9.  **Automated Test Suite**:
    *   296 tests passing across `apps.orders`, `apps.inventory`, `apps.authentication`, `apps.shop`, `apps.checkout`, `apps.cms`, `apps.analytics`, and `apps.catalog`.
10. **Newsletter & Out-of-Stock Notifications**:
    *   Verified double-opt-in newsletter subscription (`/api/cms/newsletter/subscribe/`) and durable DB persistence in `NewsletterSubscriber` and `NotificationSubscription`.
    *   Verified variant-aware out-of-stock restock alert (`/api/cms/notifications/restock/`) rendered conditionally via `RestockNotification.tsx` in `ProductDetailsClient.tsx`.
    *   Verified periodic email worker (`apps.cms.tasks.deliver_customer_notifications`) in `CELERY_BEAT_SCHEDULE` running every 60s on the `emails` queue with reserve-aware restock scanning.
    *   10/10 automated test cases passing in `apps.cms.test_notifications`.
11. **CMS Visual Media & Video Streaming (Cloudflare R2 & Database Persistence)**:
    *   Decoupled non-image catalog carousels from the visual CMS builder so the CMS exclusively manages visual image/banner sections.
    *   Added full streaming video (`.mp4`, `.webm`, `.mov` up to 100MB) support to `core.validators.validate_media_upload` and `/api/cms/media/upload/`.
    *   Synchronized video uploads to save directly to Cloudflare R2 storage bucket (`media_library/%Y/%m/`), persist records in the PostgreSQL `cms_media_asset` database table, and organize automatically into the `Videos & Reels` folder.
    *   Integrated video previews and 1-click R2 upload/selection modals in `perfumebooth-MPS` CMS `VideoSection` and Media Manager.
12. **PDP Variant Showcase & Dynamic Synchronization**:
    *   **Backend Serialization**: Added variant image URL serialization to `CatalogService.serialize_product` (`apps/catalog/services/catalog_service.py`) delivering variant images through `/api/shop/products/<slug>/`.
    *   **Redesigned Variant Selector**: Transformed `ProductVariantSelector` (`ProductVariantContext.tsx`) into a luxury card grid with variant thumbnail images, edition labels, live pricing, strike-through compare prices, discount percentage pills, and out-of-stock badges.
    *   **Dynamic Main Gallery Switching**: Subscribed `ProductGallery.tsx` to `useProductVariant()` to automatically scroll and animate the main image slider to the clicked variant's image.
    *   **Dynamic Detail Synchronization**: Updated `ProductDetailsClient.tsx` so variant clicks instantly update the displayed edition title, SKU, active price, compare price, discount percentage, in-stock/sold-out badge, and Buy Now payload.
    *   **Verification**: Ran 142 catalog & shop tests in Docker with 100% pass rate.
13. **MPS Variant Image Display & Persistence**:
    *   **Variant Image Previews in Manager**: Added dedicated `Image` column to [`VariantManager.tsx`](file:///d:/Full-Perfumebooth/perfumebooth-MPS/src/components/products/VariantManager.tsx) with 40x40 bottle thumbnails, hover-zoom previews, and direct URL editing in the expanded logistics panel.
    *   **Products List Previews**: Added inline variant avatar stack and count badge to the main products table in [`perfumebooth-MPS/src/app/(dashboard)/products/page.tsx`](file:///d:/Full-Perfumebooth/perfumebooth-MPS/src/app/\(dashboard\)/products/page.tsx) so multi-variant products (e.g. *AL HARAMAIN 15ML Attar*) immediately show variant visuals in the catalog view.
    *   **Persistence Protection**: Enhanced [`CatalogService.update_product`](file:///d:/Full-Perfumebooth/perfumebooth-backend/apps/catalog/services/catalog_service.py#L554) to preserve existing R2/S3 variant images when saving product changes from MPS.
    *   **Dual-Surface Live Verification**: Confirmed live rendering and image synchronization across both Storefront (port 3001) and MPS Merchant Portal (port 3002) for multi-variant products including *AL HARAMAIN 15ML ATTAR*.
14. **Cloudflare R2 Variant Media Sync & Asset Backfill**:
    *   **Root Cause Resolved**: Local files in Docker `/app/media/variants/` had not been uploaded to Cloudflare R2 (`perfumebooth-media` bucket), causing 404 errors on `pub-3f642c2b9ee242a79d619d782e435c8d.r2.dev/variants/...` and broken image icons in both MPS and PDP.
    *   **R2 Upload**: Uploaded all 21 local variant images to Cloudflare R2 bucket.
    *   **Missing Variant Backfill**: Downloaded high-res white-background bottle images for `badr`, `million`, `hajar`, and `oudi` from Shopify CDN, uploaded them to Cloudflare R2, and updated the PostgreSQL database records.
    *   **Cache Invalidation & Error Guards**: Flushed Redis cache (`redis-cli flushall`), added `unoptimized` and `onError` image fallback in [`ProductVariantContext.tsx`](file:///d:/Full-Perfumebooth/perfumebooth/src/components/product/ProductVariantContext.tsx), and added graceful image error fallback in [`VariantManager.tsx`](file:///d:/Full-Perfumebooth/perfumebooth-MPS/src/components/products/VariantManager.tsx). Verified all 12 variants return HTTP 200 OK.

---

### 🚧 Current Focus
*   Merchant Portal System (MPS) variant media management and catalog consistency.
*   Production configuration and environment variable verification.

---

### 📅 Next Steps
1.  **Staging End-to-End Verification**:
    *   Execute a complete simulated purchase flow using live Razorpay Test Mode keys and Shiprocket sandbox tokens.
2.  **Production Readiness & Operations**:
    *   Verify automated PostgreSQL backup cron script and retention policies.
    *   Finalize SSL, reverse proxy routing (Nginx/Cloudflare), and monitoring webhooks (Sentry / Prometheus).
3.  **Go-Live Sign-Off**:
    *   Switch payment and logistics credentials from sandbox to live production keys.
