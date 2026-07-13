# Development Rules & Best Practices — PerfumeBooth

This document outlines the libraries, tools, and coding patterns to use, as well as critical traps to avoid across all PerfumeBooth codebases.

---

## 🎨 Styling & Design Rules
*   **DO USE**: Tailwind CSS v4 utility classes and CSS Custom Variables defined in [globals.css](file:///d:/Full-Perfumebooth/perfumebooth/src/app/globals.css).
*   **DO USE**: Smooth gradients, micro-animations, and cubic-bezier curves for premium interaction states.
*   **AVOID**: Plain/generic default browser components. Everything must match the high-end luxury brand aesthetic (elegant borders, subtle gold/rose-gold accents, off-white background).
*   **AVOID**: Standard device frames in image mockups unless requested.

---

## ⚙️ Core Libraries & Framework Rules
*   **Next.js & React**:
    *   **DO USE**: Server Actions (`"use server"`) for mutation requests and fetching auth credentials to ensure security.
    *   **DO USE**: Client Components (`"use client"`) only when there is user interaction, event listeners, state hooks, or browser API dependencies.
    *   **DO USE**: Next.js custom Fonts (`next/font/google`) rather than importing direct CSS links from Google Fonts.
*   **Animations & Visuals**:
    *   **DO USE**: `framer-motion` or `@gsap/react` for complex scrolling transitions.
    *   **DO USE**: `@react-three/fiber` and `@react-three/drei` for 3D interactions.
    *   **DO USE**: `lenis` for page smooth scrolling.
*   **State Management**:
    *   **DO USE**: `zustand` for client-side stores (cart management, popup toggles, active user session flags).
    *   **AVOID**: Redux or excessive Context APIs unless absolutely necessary.

---

## 🛡️ Error Handling, Security, & Fetching Rules
*   **Next.js Server Actions**:
    *   Always wrap async Server Action calls in `try / catch` blocks.
    *   Return standardized response objects: `{ success: boolean; data?: any; error?: string }`.
    *   Store session tokens in **HTTP-only, Secure, SameSite=Lax** cookies, avoiding Client-accessible localStorage for JWTs.
*   **REST API Calls**:
    *   **DO USE**: Next.js built-in `fetch` with appropriate tag revalidation (`next: { tags: [...] }`).
    *   Verify response status `res.ok` before attempting to parse JSON.
    *   Handle backend auth refresh loops gracefully using the refresh token strategy on cookie expiration.

---

## ⛔ Code Patterns to Avoid
*   **NO DIRECT CLIENT DATABASE QUERIES**: All database access must go through the backend API.
*   **NO HARDCODED CREDENTIALS**: All API URLs, Google Auth Client IDs, and payment keys must reside in environment variables (`.env.local`).
*   **NO LARGE IMAGES WITHOUT OPTIMIZATION**: All static media and product photos must use Next.js `<Image />` component with `placeholder="blur"` and defined width/height.
*   **NO INLINE INLINE-STYLES**: Avoid inline styling in React elements except for dynamically calculated parameters (such as `transform` percentages or GSAP coordinates). Use CSS variables or Tailwind classes instead.
