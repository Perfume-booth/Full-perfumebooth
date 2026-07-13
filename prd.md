# Project Requirements Document (PRD) — PerfumeBooth

## 💎 Project Vision & Concept
**PerfumeBooth** is a high-end, premium fragrance e-commerce platform designed to bridge luxury retail with state-of-the-art web technology. The goal is to redefine the digital "Scent Journey" by using sophisticated typography, elegant color palettes, fluid animations, and interactive 3D elements, recreating the upscale tactile feeling of a luxury perfume boutique in a digital environment.

---

## 🎯 Target Audience & Persona
- **Luxury Shoppers**: Discerning consumers seeking high-end, niche, or artisanal fragrances (Oud, Attars, luxury French & Arabic scents).
- **Gift Buyers**: Individuals looking for high-quality, premium fragrance packages with customizable gift wrap options.
- **Fragrance Collectors**: Enthusiasts tracking premium brands like *Lattafa, Swiss Arabian, Armaf, Rasasi, Ajmal*, etc.
- **Mobile-First Consumers**: Shoppers purchasing on-the-go who require high-performance, smooth, and modern mobile app experiences.

---

## 🚀 Key Features

### 1. Immersive Home & Landing Experience
- **Interactive Scent Journey / Visuals**: Use of Three.js (R3F) for interactive 3D bottles and elements.
- **Smooth Navigation**: Integration of Lenis scroll and Framer Motion / GSAP animations to provide a premium feel.
- **Dynamic Brand Showcase**: Highlighting key premium perfume houses.

### 2. Sophisticated Product Browsing (Catalog & Filters)
- **Advanced Filtering**: Filtering by olfactory notes (woody, floral, citrus, spice), brands, concentrations (EDP, EDT, Extrait), size, and price.
- **Fast Search**: Auto-complete and predictive search showing matching products and categories.
- **Interactive Product Details**: Visualizing bottle sizes, reviews, ingredients list, and scent profile breakdown (Top, Heart, and Base notes).

### 3. Personalization & Interactive Discovery
- **Cloud Watch & Scent Consultation**: Interactive questionnaire or forms helping users discover their ideal scent based on preferences.
- **Smart Recommendations**: Recommending complementary products or alternative scents based on viewed items.

### 4. High-Conversion Shopping Flow
- **Seamless Cart & Quick-View**: Elegant sliding drawers and quick-view popups.
- **Optimized Checkout**: Multi-step checkout or single-page express checkout (integrated with popular gateways like Razorpay).
- **Wishlist & Registry**: Easy curation of favorite scents with high-fidelity visual indicators.

### 5. Multi-System Architecture
- **Customer Frontend**: The consumer-facing storefront (`perfumebooth`).
- **Merchant/Admin Portal (MPS)**: Dashboard for managing inventory, viewing analytics, processing custom orders, and editing content.
- **Robust API Backend**: High-performance backend handling database interactions, third-party syncs, background tasks, and authentication.
