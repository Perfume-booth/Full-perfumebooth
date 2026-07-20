# Graph Report - D:\Full-Perfumebooth  (2026-07-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1678 nodes · 3411 edges · 185 communities (106 shown, 79 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 283 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d21b581`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HasRolePermission
- CustomUser
- registry.tsx
- icon-wrapper.tsx
- products.ts
- Order
- dependencies
- devDependencies
- Navbar.tsx
- sw.js
- page.tsx
- CMSPageView
- compilerOptions
- compilerOptions
- constants.ts
- CartPageClient.tsx
- useCartStore.ts
- Product
- CollectionTemplate.tsx
- Footer.tsx
- SideFilter.tsx
- apiFetch
- handle
- ProductCard.tsx
- SectionHeader.tsx
- page.tsx
- actions.ts
- ProductReviews.tsx
- getDb
- reset-password-form.tsx
- page.tsx
- AnimatedArrowRight.tsx
- shopify.ts
- layout.tsx
- utils.ts
- AccountClient.tsx
- useAuthStore
- page.tsx
- layout.tsx
- constructor
- auth.ts
- page.tsx
- Product
- dependencies
- page.tsx
- CollectionProductGrid.tsx
- cn
- InfoHero.tsx
- page.tsx
- useNewsletterStore.ts
- CollectionsGrid.tsx
- cloud-watch-form.tsx
- clone
- appendToJsonDb
- cart.ts
- cachedResponseWillBeUsed
- AccountHero.tsx
- SearchBar.tsx
- customer.ts
- layout.tsx
- BlogSectionWrapper.tsx
- getCustomer
- storage.ts
- page.tsx
- loading.tsx
- WelcomeModal.tsx
- ClientOverlays.tsx
- invoice.ts
- ShopConfig
- urls.py
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- CancelButton.tsx
- AuthenticationConfig
- CMSConfig
- OrdersConfig
- main
- next.config.ts
- proxy.ts
- page.tsx
- page.tsx
- sw.ts
- AuthGuard.tsx
- useCompareStore
- checkout.ts
- embla-carousel-autoplay
- embla-carousel-class-names
- embla-carousel-react
- embla-carousel-wheel-gestures
- @emotion/react
- @emotion/styled
- framer-motion
- graphql
- @gsap/react
- html2pdf.js
- js-cookie
- lenis
- lottie-react
- motion
- @mui/material
- @next/third-parties
- nprogress
- 0001_initial.py
- 0002_auditlog.py
- 0003_custom_auth.py
- 0001_initial.py
- 0001_initial.py
- 0001_initial.py
- 0002_alter_product_image_alter_productimage_image.py
- 0003_collection.py
- 0004_autocollection_productcollection_and_more.py
- 0005_product_created_by_product_updated_by.py
- 0006_autocollection_excluded_products_and_more.py
- 0007_pagebanner_pagebannerimage.py
- asgi.py
- settings.py
- wsgi.py
- eslint.config.mjs
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- debug_console.js
- clsx
- lucide-react
- r3f-perf
- @radix-ui/react-slot
- @radix-ui/react-tooltip
- razorpay
- react
- react-countup
- react-dom
- react-icons
- @react-three/drei
- @react-three/fiber
- @react-three/postprocessing
- serwist
- @serwist/next
- @serwist/precaching
- sharp
- tailwind-merge
- @tanstack/react-virtual
- three
- three-mesh-bvh
- zustand
- postcss.config.mjs
- package.json
- tailwind.config.ts
- delete

## God Nodes (most connected - your core abstractions)
1. `IconWrapper()` - 79 edges
2. `IconProps` - 78 edges
3. `pathVariants` - 78 edges
4. `HasRolePermission` - 34 edges
5. `CustomUser` - 30 edges
6. `cn()` - 28 edges
7. `Product` - 27 edges
8. `Inventory` - 25 edges
9. `ProductImage` - 23 edges
10. `PageBanner` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Navbar()` --indirect_call--> `User`  [INFERRED]
  perfumebooth/src/components/layout/Navbar.tsx → perfumebooth-MPS/src/store/useAuthStore.ts
- `StaffSettingsPage()` --calls--> `apiFetch()`  [EXTRACTED]
  perfumebooth-MPS/src/app/(dashboard)/settings/staff/page.tsx → perfumebooth-MPS/src/lib/api.ts
- `HasRolePermission` --uses--> `CustomUser`  [INFERRED]
  perfumebooth-backend/apps/authentication/views.py → perfumebooth-backend/apps/authentication/models.py
- `HasRolePermission` --uses--> `Role`  [INFERRED]
  perfumebooth-backend/apps/authentication/views.py → perfumebooth-backend/apps/authentication/models.py
- `HasRolePermission` --uses--> `UserRole`  [INFERRED]
  perfumebooth-backend/apps/authentication/views.py → perfumebooth-backend/apps/authentication/models.py

## Import Cycles
- 1-file cycle: `perfumebooth-backend/core/celery.py -> perfumebooth-backend/core/celery.py`
- 3-file cycle: `perfumebooth/src/app/products/[slug]/page.tsx -> perfumebooth/src/components/product/ProductDetailsClient.tsx -> perfumebooth/src/store/useCartStore.ts -> perfumebooth/src/app/products/[slug]/page.tsx`
- 3-file cycle: `perfumebooth/src/app/products/[slug]/page.tsx -> perfumebooth/src/components/product/ProductDetailsClient.tsx -> perfumebooth/src/store/useRecentStore.ts -> perfumebooth/src/app/products/[slug]/page.tsx`
- 3-file cycle: `perfumebooth/src/app/products/[slug]/page.tsx -> perfumebooth/src/components/product/RecentlyViewed.tsx -> perfumebooth/src/store/useRecentStore.ts -> perfumebooth/src/app/products/[slug]/page.tsx`
- 4-file cycle: `perfumebooth/src/app/products/[slug]/page.tsx -> perfumebooth/src/components/product/RecentlyViewed.tsx -> perfumebooth/src/components/product/ProductCard.tsx -> perfumebooth/src/store/useCartStore.ts -> perfumebooth/src/app/products/[slug]/page.tsx`
- 4-file cycle: `perfumebooth/src/app/products/[slug]/page.tsx -> perfumebooth/src/components/product/RelatedProducts.tsx -> perfumebooth/src/components/product/ProductCard.tsx -> perfumebooth/src/store/useCartStore.ts -> perfumebooth/src/app/products/[slug]/page.tsx`

## Communities (185 total, 79 thin omitted)

### Community 0 - "HasRolePermission"
Cohesion: 0.06
Nodes (65): log_action(), Creates an AuditLog record for the given user action., HasRolePermission, Custom DRF permission class for role-based access control., InventoryInline, PageBannerAdmin, PageBannerImageInline, ProductAdmin (+57 more)

### Community 1 - "CustomUser"
Cohesion: 0.05
Nodes (59): AbstractBaseUser, BaseCommand, BaseUserAdmin, BaseUserManager, CustomUserAdmin, RoleAdmin, UserRoleAdmin, UserRoleInline (+51 more)

### Community 3 - "icon-wrapper.tsx"
Cohesion: 0.09
Nodes (11): AnimatedBanknote(), AnimatedFilter(), AnimatedIndianRupee(), AnimatedMenu(), AnimatedPinterest(), AnimatedSlidersHorizontal(), AnimatedUsers(), IconProps (+3 more)

### Community 4 - "products.ts"
Cohesion: 0.07
Nodes (29): h(), POST(), GET(), CollectionsPage(), metadata, CollectionsClientProps, CollectionProductsResult, getAllCollections() (+21 more)

### Community 5 - "Order"
Cohesion: 0.08
Nodes (28): OrderAdmin, OrderItemAdmin, OrderItemInline, Meta, Order, OrderItem, Orders Domain Models ────────────────────── Order     — purchase record tied t, A single product line within an order. (+20 more)

### Community 6 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, clsx, lucide-react, next, react, react-dom, recharts, tailwind-merge (+34 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (37): browserslist, devDependencies, eslint, eslint-config-next, @playwright/test, tailwindcss, @tailwindcss/postcss, ts-node (+29 more)

### Community 8 - "Navbar.tsx"
Cohesion: 0.11
Nodes (19): AccountSidebar(), AccountSidebarProps, dropdownVariants, itemVariants, MENU_ITEMS, MenuItem, DeliveryLocation, PINCODE_MAP (+11 more)

### Community 9 - "sw.js"
Cohesion: 0.08
Nodes (10): _awaitComplete(), createHandlerBoundToUrl(), destroy(), doneWaiting(), getEndEntryFromIndex(), getFirstEntryByQueueName(), getLastEntryByQueueName(), getPrecacheKeyForUrl() (+2 more)

### Community 10 - "page.tsx"
Cohesion: 0.11
Nodes (15): CATEGORIES, containerVariants, itemVariants, CATEGORIES, containerVariants, itemVariants, OrderDetailsProps, OrderHistoryProps (+7 more)

### Community 11 - "CMSPageView"
Cohesion: 0.12
Nodes (16): CMSPageAdmin, CMSSectionAdmin, CMSSectionInline, CMSPage, CMSSection, Meta, Headless CMS Models ───────────────────── CMSPage    — a published page (homep, Top-level page entity.     Each page is identified by a slug and carries SEO me (+8 more)

### Community 12 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 13 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 14 - "constants.ts"
Cohesion: 0.09
Nodes (15): CONTACT_CHANNELS, CONTACT_CHANNELS, Category, CATEGORY_ACCENTS, AnimatedMessageCircle(), ANNOUNCEMENT_MESSAGES, BRAND_SUB_MENU, COMPANY (+7 more)

### Community 15 - "CartPageClient.tsx"
Cohesion: 0.14
Nodes (11): Props, HeroBannerProps, HeroSlide, ProductGalleryProps, AnimatedBadgePercent(), AnimatedChevronLeft(), AnimatedChevronRight(), AnimatedGift() (+3 more)

### Community 16 - "useCartStore.ts"
Cohesion: 0.12
Nodes (21): CartPageClient(), CheckoutClient(), ShippingMethods(), ShippingMethodsProps, CartHydrator(), OrderSuccess(), CartDropdown(), dropdownVariants (+13 more)

### Community 17 - "Product"
Cohesion: 0.14
Nodes (18): BestSellerSection(), extractProducts(), ProductEdge, extractProducts(), NewLaunchesSection(), ProductEdge, ProductCarouselProps, extractProducts() (+10 more)

### Community 18 - "CollectionTemplate.tsx"
Cohesion: 0.14
Nodes (11): metadata, metadata, metadata, metadata, CollectionTemplate(), CollectionTemplateProps, useFilterLogic(), loadMoreCollectionProducts() (+3 more)

### Community 19 - "Footer.tsx"
Cohesion: 0.14
Nodes (13): OrderSuccessProps, Footer(), PAYMENT_METHODS, POLICY_LINKS, SOCIAL_LINKS, AnimatedCheckCircle(), AnimatedClock(), AnimatedInstagram() (+5 more)

### Community 20 - "SideFilter.tsx"
Cohesion: 0.14
Nodes (14): ExpandableNarrative(), Props, Tab, TABS, FilterSection(), FilterSectionProps, FilterValue, BackToTop() (+6 more)

### Community 21 - "apiFetch"
Cohesion: 0.13
Nodes (17): BannerImage, BannersPage(), PageBanner, CMSBuilderPage(), CMSPageSummary, CMSSection, Collection, CollectionsPage() (+9 more)

### Community 22 - "handle"
Cohesion: 0.18
Nodes (23): cacheMatch(), cachePut(), _ensureResponseSafeToCache(), fetch(), fetchAndCachePut(), findMatchingRoute(), getCacheKey(), _getNetworkPromise() (+15 more)

### Community 23 - "ProductCard.tsx"
Cohesion: 0.19
Nodes (16): OrderSuccessfullyPage(), WishlistPage(), ProductCard(), ProductCardProps, ProductDetailsClient(), WishlistHydrator(), mapProductToGA4Item(), trackAddToCart() (+8 more)

### Community 24 - "SectionHeader.tsx"
Cohesion: 0.10
Nodes (8): FEATURED_BRANDS, GENDER_CARDS, SCENT_JOURNEY_DATA, VIDEO_CAROUSEL_DATA, VideoItem, Carousel(), CarouselProps, SectionHeaderProps

### Community 25 - "page.tsx"
Cohesion: 0.18
Nodes (8): AnimatedArrowLeft(), AnimatedCalendarDays(), AnimatedFacebook(), AnimatedGrid3X3(), AnimatedMail(), AnimatedMoveRight(), AnimatedShare2(), AnimatedXSocial()

### Community 26 - "actions.ts"
Cohesion: 0.15
Nodes (10): OrderDetailPage(), OrderPageProps, Coupon, getAdminOrderAction(), getAdminOrderByIdAction(), getGuestOrderAction(), getLoggedAddressAction(), ProductOffer (+2 more)

### Community 27 - "ProductReviews.tsx"
Cohesion: 0.18
Nodes (9): ReviewData, ReviewData, AnimatedCamera(), AnimatedGitCompare(), AnimatedLoader2(), AnimatedMessageSquare(), AnimatedStar(), AnimatedTrash2() (+1 more)

### Community 28 - "getDb"
Cohesion: 0.18
Nodes (13): addEntry(), get(), getAllEntriesByQueueName(), getDb(), getEntryCountByQueueName(), getFirstEntryId(), _getId(), getTimestamp() (+5 more)

### Community 29 - "reset-password-form.tsx"
Cohesion: 0.13
Nodes (3): AnimatedAlertCircle(), Label, ResetPasswordFormProps

### Community 30 - "page.tsx"
Cohesion: 0.25
Nodes (12): cleanImageUrl(), generateMetadata(), getProduct(), getRecommendedProducts(), ProductImage, ProductPage(), METAFIELD_MAPPINGS, cleanMetafieldValue() (+4 more)

### Community 31 - "AnimatedArrowRight.tsx"
Cohesion: 0.22
Nodes (7): metadata, BlogCard(), BlogCardProps, BlogSectionProps, TrackOrderForm(), AnimatedArrowRight(), Article

### Community 32 - "shopify.ts"
Cohesion: 0.19
Nodes (10): AboutUsPage(), metadata, DisclaimersPage(), metadata, metadata, ShippingPolicyPage(), getAboutUs(), getDisclaimers() (+2 more)

### Community 33 - "layout.tsx"
Cohesion: 0.16
Nodes (11): cormorant, inter, metadata, viewport, CartHydrator, ClientOverlays, ClientSideHydrators(), NewsletterHydrator (+3 more)

### Community 34 - "utils.ts"
Cohesion: 0.17
Nodes (8): Button, ButtonProps, buttonVariants, Dock(), DockProps, FaqItem, FaqSection, FaqSectionProps

### Community 35 - "AccountClient.tsx"
Cohesion: 0.15
Nodes (10): AccountClientProps, Customer, NAV_TABS, Tab, AnimatedEdit2(), addAddressAction(), deleteAddressAction(), setDefaultAddressAction() (+2 more)

### Community 36 - "useAuthStore"
Cohesion: 0.29
Nodes (6): LoginPage(), DashboardLayout(), Sidebar(), AuthState, useAuthStore, User

### Community 37 - "page.tsx"
Cohesion: 0.17
Nodes (11): CategoryData, DashboardPage(), defaultCategoryData, defaultKPIs, defaultLowStock, defaultRecentOrders, defaultSalesTrend, KPI (+3 more)

### Community 38 - "layout.tsx"
Cohesion: 0.24
Nodes (7): geistMono, geistSans, metadata, Navbar(), ThemeProvider(), ThemeState, useThemeStore

### Community 39 - "constructor"
Cohesion: 0.25
Nodes (9): _addSyncListener(), addToPrecacheList(), constructor(), getIntegrityForPrecacheKey(), getUrlsToPrecacheKeys(), _match(), registerCapture(), registerRoute() (+1 more)

### Community 40 - "auth.ts"
Cohesion: 0.30
Nodes (10): ForgotPasswordPage(), CloudWatchFormInner(), forgotPasswordAction(), getSession(), loginAction(), refreshAccessToken(), registerAction(), setAuthCookies() (+2 more)

### Community 41 - "page.tsx"
Cohesion: 0.20
Nodes (7): BrandSlider, GenderSection, InstagramFeed, RecentlyViewed, ScentGrid, VideoSection, CollectionSkeleton()

### Community 42 - "Product"
Cohesion: 0.23
Nodes (8): Product, Props, Props, RecentlyViewed(), Props, CartItem, RecentState, useRecentStore

### Community 43 - "dependencies"
Cohesion: 0.18
Nodes (11): class-variance-authority, gsap, dependencies, class-variance-authority, gsap, next, react-hot-toast, @react-oauth/google (+3 more)

### Community 44 - "page.tsx"
Cohesion: 0.25
Nodes (8): HomePage(), BrandPage(), BrandPageProps, generateMetadata(), CollectionBannerProps, getBanner(), getCollectionProducts(), BRAND_MEDIA

### Community 45 - "CollectionProductGrid.tsx"
Cohesion: 0.27
Nodes (8): Breadcrumb(), BreadcrumbItem, BreadcrumbProps, CollectionProductGrid(), CollectionContext, CollectionContextType, useCollection(), trackViewItemList()

### Community 46 - "cn"
Cohesion: 0.20
Nodes (10): cityFromPincode(), DeliverTo(), DrawerLink(), MobileDeliverTo(), NavIconBtn(), formatDate(), ProductReviews(), FooterBackgroundGradient() (+2 more)

### Community 47 - "InfoHero.tsx"
Cohesion: 0.22
Nodes (5): metadata, FaqPage(), metadata, InfoHeroProps, getFaq()

### Community 48 - "page.tsx"
Cohesion: 0.22
Nodes (7): RootLayout(), BrandsPage(), metadata, FeaturedBrandsProps, SideFilter(), getBrands(), TOP_BRANDS

### Community 49 - "useNewsletterStore.ts"
Cohesion: 0.31
Nodes (6): NewsletterHydrator(), NewsletterStrip(), AnimatedCheck(), checkNewsletterSubscriptionAction(), NewsletterState, useNewsletterStore

### Community 50 - "CollectionsGrid.tsx"
Cohesion: 0.22
Nodes (7): cardVariants, CollectionsGrid(), containerVariants, DEFAULT, FALLBACK_MAP, getMedia(), AnimatedChevronRight()

### Community 51 - "cloud-watch-form.tsx"
Cohesion: 0.22
Nodes (3): AuthSwitch(), CloudWatchFormProps, Input

### Community 52 - "clone"
Cohesion: 0.27
Nodes (10): _addRequest(), clone(), fromRequest(), popRequest(), pushRequest(), _removeRequest(), replayRequests(), shiftRequest() (+2 more)

### Community 53 - "appendToJsonDb"
Cohesion: 0.42
Nodes (5): POST(), POST(), appendToJsonDb(), readJsonDb(), writeJsonDb()

### Community 55 - "cachedResponseWillBeUsed"
Cohesion: 0.38
Nodes (7): cacheDidUpdate(), cachedResponseWillBeUsed(), expireEntries(), _getCacheExpiration(), _getDateHeaderTimestamp(), _isResponseDateFresh(), updateTimestamp()

### Community 56 - "AccountHero.tsx"
Cohesion: 0.33
Nodes (4): AccountHeroProps, md5(), UserProfileAvatar(), UserProfileAvatarProps

### Community 57 - "SearchBar.tsx"
Cohesion: 0.38
Nodes (5): SearchBar(), SearchBarProps, SuggestionProduct, AnimatedSearch(), useDebounce()

### Community 59 - "layout.tsx"
Cohesion: 0.47
Nodes (4): AccountLayout(), metadata, AccountPage(), requireCustomer

### Community 60 - "BlogSectionWrapper.tsx"
Cohesion: 0.40
Nodes (5): BlogPostPage(), BlogSection, BlogSectionWrapper(), getArticle(), getBlogArticles()

### Community 61 - "getCustomer"
Cohesion: 0.53
Nodes (4): CheckoutPage(), OrdersPage(), getCustomerOrdersAction(), getCustomer()

### Community 62 - "storage.ts"
Cohesion: 0.40
Nodes (5): createSafeStorage(), isQuotaExceededError(), safeLocalStorage, safeSessionStorage, StorageType

### Community 63 - "page.tsx"
Cohesion: 0.50
Nodes (4): NOTE_OPTIONS, parseNotes(), Product, ProductsPage()

### Community 65 - "WelcomeModal.tsx"
Cohesion: 0.60
Nodes (3): WelcomeModal(), AuthState, useAuthStore

### Community 66 - "ClientOverlays.tsx"
Cohesion: 0.40
Nodes (3): CompareModal, FloatingReviews, WhatsAppCTA

### Community 67 - "invoice.ts"
Cohesion: 0.50
Nodes (4): OrderDetailsComponent(), downloadInvoice(), getStateCode(), stateCodes

### Community 69 - "urls.py"
Cohesion: 0.50
Nodes (3): health_check(), PerfumeBooth Global URL Router, Simple health-check endpoint for Docker & load balancer probes.

### Community 70 - "page.tsx"
Cohesion: 0.50
Nodes (3): AuditLog, StaffSettingsPage(), StaffUser

### Community 71 - "page.tsx"
Cohesion: 0.67
Nodes (3): BlogArchivePage(), metadata, getBlog()

### Community 72 - "page.tsx"
Cohesion: 0.67
Nodes (3): metadata, PrivacyPolicyPage(), getPrivacyPolicy()

### Community 73 - "page.tsx"
Cohesion: 0.67
Nodes (3): metadata, RefundPolicyPage(), getRefundPolicy()

### Community 74 - "page.tsx"
Cohesion: 0.67
Nodes (3): metadata, TermsAndConditionsPage(), getTermsAndConditions()

### Community 77 - "CancelButton.tsx"
Cohesion: 0.67
Nodes (3): CancelButton(), CancelButtonProps, cancelOrder()

### Community 90 - "useCompareStore"
Cohesion: 0.67
Nodes (3): CompareBar(), CompareModal(), useCompareStore

### Community 184 - "delete"
Cohesion: 0.22
Nodes (9): d(), delete(), deleteCacheAndMetadata(), deleteEntry(), handleActivate(), m(), popEntry(), _removeEntry() (+1 more)

## Knowledge Gaps
- **349 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+344 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **79 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `products.ts` to `sw.js`, `handle`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `Navbar()` connect `Navbar.tsx` to `useAuthStore`, `cn`, `useCartStore.ts`, `SideFilter.tsx`, `ProductCard.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `HasRolePermission` (e.g. with `AuditLog` and `CustomUser`) actually correct?**
  _`HasRolePermission` has 31 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _349 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HasRolePermission` be split into smaller, more focused modules?**
  _Cohesion score 0.05690312738367658 - nodes in this community are weakly interconnected._
- **Should `CustomUser` be split into smaller, more focused modules?**
  _Cohesion score 0.050724637681159424 - nodes in this community are weakly interconnected._
- **Should `registry.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.02631578947368421 - nodes in this community are weakly interconnected._