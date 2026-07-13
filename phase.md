# Project Roadmap & Execution Phases — PerfumeBooth

This roadmap breaks down the development of PerfumeBooth into structural phases, mapping out core requirements from setup to launch.

---

## 📍 Phase 1: Foundation & Styling System (COMPLETED)
*   [x] Set up base project structure (Storefront, Django Backend, MPS Admin).
*   [x] Establish core Design System with color tokens (gold, maroon, mauve, dark slate) and font configurations (Cormorant Garamond & Inter).
*   [x] Create atomic UI elements (Buttons, Inputs, Alerts, Loaders).
*   [x] Implement basic route layouts, smooth scrolling (Lenis), and client-side hydration.

## 📍 Phase 2: User Authentication & Profile Flow (CURRENT)
*   [x] Establish Django DRF token authentication endpoints.
*   [x] Build frontend Server Actions (`loginAction`, `registerAction`, `verifyOtpAction`) mapping to backend.
*   [/] Integrate third-party OAuth (Google Login API) inside client components.
*   [ ] Connect account settings layout (saved addresses, order tracking).
*   [ ] Create UI components for forgotten passwords and validation OTPs.

## 📍 Phase 3: Catalog, Search, & Discovery (UPCOMING)
*   [ ] Integrate backend catalog APIs for category, brand, and product feeds.
*   [ ] Implement advanced client-side filters (price, olfactory notes, concentration).
*   [ ] Develop the "Cloud Watch / Scent Consultation" interactive form helping users discover matching perfumes.
*   [ ] Integrate pgvector search on backend to recommend items with similar scent profiles.

## 📍 Phase 4: Cart, Wishlist, & Checkout (UPCOMING)
*   [ ] Build global Zustand store to coordinate local and backend carts.
*   [ ] Create elegant sliding drawer cart overlay.
*   [ ] Develop standard single-page checkout flow.
*   [ ] Integrate payment processing via Razorpay SDK/API hooks.
*   [ ] Build webhook handlers to update inventory on successful transactions.

## 📍 Phase 5: Merchant Portal (MPS) & Management (UPCOMING)
*   [ ] Establish secure admin routing and authentication in `perfumebooth-MPS`.
*   [ ] Create dashboard visualizations for sales, conversions, and popular fragrances.
*   [ ] Build product creation/edit panels mapping to Django CRUD APIs.
*   [ ] Add bulk order fulfillment and tracking system.

## 📍 Phase 6: Optimizations, Testing, & Deployment
*   [ ] Perform performance optimization (Next.js server-side caching, image compression, script loading).
*   [ ] Write End-to-End tests using Playwright.
*   [ ] Set up Docker files for containerized production deployment.
*   [ ] Configure AWS S3 bucket for product images and media files.
