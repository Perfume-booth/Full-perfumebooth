# PerfumeBooth - Premium Fragrance E-Commerce

PerfumeBooth is a high-end, Exclusive fragrance e-commerce platform . It delivers an immersive shopping experience characterized by seamless animations, interactive 3D elements, and a sophisticated design system tailored for the premium fragrance market.

## 💎 Project Vision
To redefine the digital "Scent Journey" by merging state-of-the-art web technologies with high-fashion aesthetics, ensuring every interaction feels as premium as the fragrances themselves.

---

## 🚀 Tech Stack

### Core Framework
- **Next.js 16+** (App Router)
- **React 19**
- **TypeScript**

### Visuals & Motion
- **3D Rendering**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **Animations**: GSAP (GreenSock), Framer Motion
- **Styling**: Tailwind CSS v4, `clsx`, `tailwind-merge`
- **Smooth Scrolling**: Lenis

### Data & State
- **Backend**: Django REST Framework with PostgreSQL
- **State Management**: Zustand
- **API Clients**: GraphQL, Axios

### UI Components
- **Carousels**: Embla Carousel, Swiper
- **Primitives**: Radix UI, Material UI (MUI)
- **Icons**: Lucide React, React Icons

---

## 📂 Directory Structure

```bash
src/
├── app/          # Next.js App Router (Pages, Layouts, API)
├── components/   # Reusable UI components (Atomic design)
├── hooks/        # Custom React hooks (e.g., useDraggableScroll)
├── lib/          # Django API clients, server actions, and utilities
├── services/     # API services and data fetching logic
├── store/        # Zustand state definitions   
├── styles/       # Global styles and typography (Tailwind v4)
├── types/        # Global TypeScript interfaces

```

---

## 🛠️ Development Workflow

### 1. Prerequisites
- Node.js (Latest LTS)
- npm or yarn

### 2. Environment Setup
Create a `.env.local` file in the root directory and add the following (refer to the team Lead for production keys):
```env
BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

### 3. Installation
```bash
npm install
```

### 4. Running Locally
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
npm run start
```

---

## ✨ Design & Performance Principles

### 1. Premium Aesthetic
- **Typography**: Standardized Exclusive fonts across all sections.
- **Micro-interactions**: Every click and scroll is enhanced with smooth animations.
- **Video Content**: High-quality, looping video banners without disruptive controls.

### 2. Technical Excellence
- **Hydration Stability**: Rigorous mounting guards to prevent SSR/CSR mismatches.
- **WebGL Optimization**: Proactive memory management for 3D elements to prevent leaks.
- **Performance**: Optimized LCP through priority image loading and asset compression.
- **Accessibility**: ARIA-compliant loading states and semantic HTML.

---

## 🔒 Private Repository
This is a private repository. Unauthorized copying, distribution, or use of the code within is strictly prohibited.

---

© 2026 PerfumeBooth /  All rights reserved.
