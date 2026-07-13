# Design System & Aesthetics — PerfumeBooth

This document defines the premium aesthetic design system, typography, and styling variables configured for PerfumeBooth.

---

## 🎨 Theme & Palette

The design utilizes a **luxury boutique concept**: a combination of dark, elegant backgrounds (`#fafafa` with `#1a1410`), rich accents (Gold, Maroon, Deep Purple), and clean interface separation.

### Core Variables (`globals.css`)
```css
:root {
  /* Core Canvas */
  --color-bg: #fafafa;            /* Warm linen/white canvas */
  --color-bg-subtle: #f4f1ef;     /* Secondary section background */
  --color-surface: #ffffff;       /* Cards and modals */
  --color-border: #e8e3de;        /* Elegant, thin border lines */
  --color-border-dark: #c8bfb5;   /* Distinct separators */

  /* Text & Contrast */
  --color-text-primary: #1a1410;  /* Rich charcoal slate */
  --color-text-secondary: #4a4038;/* Dark warm gray */
  --color-text-muted: #8a7968;    /* Muted sand */

  /* Luxury Accents */
  --color-gold: #b8924a;          /* Vintage Gold */
  --color-gold-light: #d4af72;    /* Warm Gold */
  --color-gold-dark: #87652a;     /* Deep Gold */
  --color-maroon: #7b0d1e;        /* Royal Maroon */
  --color-maroon-light: #a01428;  /* Vivid Crimson */
  --color-purple: #1A0F2E;        /* Nocturnal Purple */
  --color-amber: #FFBF00;         /* Honey Amber */
  --color-emerald: #50C878;       /* Emerald Accent */
}
```

---

## ✍️ Typography & Hierarchy

We utilize two primary font families to build the premium editorial feeling:
1.  **Cormorant Garamond** (Serif / Variable): Used for luxury editorial titles, hero headers, blockquotes, and brand names.
2.  **Inter** (Sans-Serif / Variable): Used for clean, legible product details, navigation items, pricing, forms, and general body copy.

### Text Classes
*   **Hero Heading**: `font-serif text-5xl md:text-7xl font-light tracking-wide text-neutral-900`
*   **Section Title**: `font-serif text-3xl md:text-4xl font-normal tracking-normal text-neutral-800`
*   **Product Grid Label**: `font-sans text-sm font-semibold tracking-wider uppercase text-neutral-700`
*   **Body Content**: `font-sans text-base text-neutral-600 leading-relaxed`

---

## ✨ Micro-Animations & Motion

Animations are configured in CSS and triggered via Framer Motion / GSAP, using the standard premium curve:
*   **Premium Easing**: `cubic-bezier(0.65, 0, 0.35, 1)` (smooth, slow start, rapid transition, gentle finish)
*   **Keyframes**:
    *   `fade-in-bottom`: Used for progressive page layout elements sliding up.
    *   `tracking-in-expand`: Letter-spacing expansion for luxury header entries.
    *   `shadow-drop-2-center`: Card liftoff shadow effect on hover.
    *   `rotate-in-2-fwd-ccw`: Spinning entry effect for active selection indicators.
