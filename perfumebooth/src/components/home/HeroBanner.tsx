"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const AUTOPLAY_DELAY_MS = 3000;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export interface HeroSlide {
  id: number | string;
  image: string;
  mobileImage?: string;
  href?: string;
  alt_text?: string;
}

interface HeroBannerProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  slides?: HeroSlide[];
}

function ResponsiveHeroImage({ slide, eager }: { slide: HeroSlide; eager: boolean }) {
  const alt = slide.alt_text || "Featured fragrance collection";

  if (!slide.mobileImage || slide.mobileImage === slide.image) {
    return (
      <Image
        src={slide.image}
        alt={alt}
        fill
        priority={eager}
        fetchPriority={eager ? "high" : "auto"}
        quality={85}
        sizes="100vw"
        className="object-cover object-center"
      />
    );
  }

  // Native art direction makes the exact LCP URL discoverable in the initial
  // HTML and prevents a desktop image from downloading before mobile JS runs.
  return (
    <picture className="absolute inset-0 block h-full w-full">
      <source media="(max-width: 1023px)" srcSet={slide.mobileImage} />
      <img
        src={slide.image}
        alt={alt}
        width={1920}
        height={1080}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-center"
      />
    </picture>
  );
}

export default function HeroBanner({ title, subtitle, imageUrl, slides = [] }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [autoplayPreference, setAutoplayPreference] = useState<boolean | null>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const isAutoplaying = autoplayPreference ?? !prefersReducedMotion;

  const next = useCallback(() => {
    setCurrent((index) => (slides.length ? (index + 1) % slides.length : 0));
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((index) => (slides.length ? (index - 1 + slides.length) % slides.length : 0));
  }, [slides.length]);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || !isAutoplaying || isInteractionPaused) return;

    const timer = window.setTimeout(next, AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [current, isAutoplaying, isInteractionPaused, next, slides.length]);

  if (imageUrl) {
    return (
      <section className="pt-20 lg:pt-28" aria-label={title || "Featured collection"}>
        <div className="relative flex h-[38svh] w-full items-center justify-center overflow-hidden md:h-[70svh] lg:h-[89svh]">
          <Image src={imageUrl} alt={title || "Premium perfume banner"} fill priority quality={85} sizes="100vw" className="object-cover object-center" />
          {(title || subtitle) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 p-4 text-center text-white">
              {title && <h1 className="mb-4 font-serif text-2xl md:text-6xl lg:text-7xl">{title}</h1>}
              {subtitle && <p className="text-sm font-light uppercase tracking-widest md:text-xl">{subtitle}</p>}
            </div>
          )}
        </div>
      </section>
    );
  }

  const slide = slides[current];
  if (!slide) return null;

  return (
    <section
      className="pt-20 lg:pt-28"
      aria-label="Featured collections"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsInteractionPaused(true)}
      onMouseLeave={() => setIsInteractionPaused(false)}
      onFocusCapture={() => setIsInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsInteractionPaused(false);
        }
      }}
    >
      <div className="relative flex h-[38svh] w-full select-none items-center justify-center overflow-hidden md:h-[70svh] lg:h-[89svh]">
        <Link key={slide.id} href={slide.href || "/all"} className="hero-slide-enter absolute inset-0 block" aria-label={slide.alt_text || "View featured collection"}>
          <ResponsiveHeroImage slide={slide} eager={current === 0} />
        </Link>

        {slides.length > 1 && (
          <>
            <button type="button" onClick={prev} aria-label="Previous featured collection" className="absolute left-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-4 sm:size-12">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button type="button" onClick={next} aria-label="Next featured collection" className="absolute right-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-4 sm:size-12">
              <ChevronRight size={22} aria-hidden="true" />
            </button>

            <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center sm:bottom-4" aria-label="Choose featured collection">
              {slides.map((item, index) => {
                const isActive = index === current;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Show slide ${index + 1}: ${item.alt_text || "Featured fragrance collection"}`}
                    aria-current={isActive ? "true" : undefined}
                    className="group/dot flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-7px] focus-visible:outline-white"
                  >
                    <span
                      aria-hidden="true"
                      className={`block rounded-full shadow-[0_1px_5px_rgba(0,0,0,0.55)] transition-[width,height,background-color,transform] duration-300 ${isActive ? "size-2.5 scale-100 bg-white" : "size-2 scale-90 bg-white/55 group-hover/dot:bg-white/85"}`}
                    />
                  </button>
                );
              })}
            </div>

          </>
        )}
      </div>
    </section>
  );
}
