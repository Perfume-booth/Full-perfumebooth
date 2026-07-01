"use client";

import { useState, useEffect, useCallback } from "react";
import Image, { getImageProps } from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedChevronLeft } from "@/components/ui/icons/AnimatedChevronLeft";
import { AnimatedChevronRight } from "@/components/ui/icons/AnimatedChevronRight";

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
  image?: string; 
  imageUrl?: string; 
  slides?: HeroSlide[]; 
}

function ResponsiveHeroImage({ slide, current }: { slide: HeroSlide, current: number }) {
  const isPriority = current === 0;
  const common = {
    alt: slide.alt_text || `Perfume banner ${current + 1}`,
    fill: true,
    priority: isPriority,
    quality: 85,
    sizes: "100vw",
  };

  // If no separate mobile image, just use standard Next/Image
  if (!slide.mobileImage || slide.mobileImage === slide.image) {
    return (
      // eslint-disable-next-line jsx-a11y/alt-text
      <Image 
        src={slide.image} 
        {...common} 
        fetchPriority={isPriority ? "high" : "auto"} 
        className="object-cover object-center w-full h-full" 
      />
    );
  }

  // Art Direction: Prevent double downloading/preloading on mobile
  const { props: desktop } = getImageProps({ ...common, src: slide.image });
  const { props: mobile } = getImageProps({ ...common, src: slide.mobileImage });

  return (
      <picture className="absolute inset-0 w-full h-full">
      <source media="(min-width: 1024px)" srcSet={desktop.srcSet} />
      <source media="(max-width: 1023px)" srcSet={mobile.srcSet} />
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img 
        {...desktop} 
        className="object-cover object-center w-full h-full" 
        fetchPriority={isPriority ? "high" : "auto"} 
      />
    </picture>
  );
}

export default function HeroBanner({ title, subtitle, imageUrl, slides = [] }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [, setDirection] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const activeSlides = slides;

  const goTo = useCallback((index: number, dir: number) => {
    if (activeSlides.length === 0) return;
    setDirection(dir);
    setCurrent(index);
  }, [activeSlides.length]);

  const next = useCallback(() => {
    if (activeSlides.length === 0) return;
    goTo((current + 1) % activeSlides.length, 1);
  }, [current, goTo, activeSlides.length]);

  const prev = useCallback(() => {
    if (activeSlides.length === 0) return;
    goTo((current - 1 + activeSlides.length) % activeSlides.length, -1);
  }, [current, goTo, activeSlides.length]);

  useEffect(() => {
    if (imageUrl || activeSlides.length <= 1 || isHovered) return;
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next, imageUrl, activeSlides.length, isHovered]);

  const slide = activeSlides[current];

  if (!imageUrl && activeSlides.length === 0) return null;

  if (imageUrl) {
    return (
      <section className="pt-20 lg:pt-28">
        <div className="relative w-full h-[38svh] md:h-[70svh] lg:h-[89svh] overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0">
            {imageUrl && imageUrl !== "" && (
              <Image
                src={imageUrl}
                alt={title || "Premium Perfume Banner"}
                fill
                priority
                quality={90}
                className="object-cover object-center w-full h-full"
                sizes="100vw"
              />
            )}
            {(title || subtitle) && (
              <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center text-white text-center p-4">
                {title && (
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl lg:text-7xl font-serif mb-4"
                  >
                    {title}
                  </motion.h1>
                )}
                {subtitle && (
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl font-light tracking-widest uppercase"
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-20 lg:pt-28">
      {/* HERO */}
      <div 
        className="relative w-full h-[38svh] md:h-[70svh] lg:h-[89svh] overflow-hidden flex items-center justify-center select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >

        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            className="absolute inset-0 flex overflow-hidden"
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const sliceWidth = 100 / 6;
              const directionFactor = i % 2 === 0 ? 1 : -1;
              
              return (
                <motion.div
                  key={i}
                  initial={{ y: directionFactor * -100 + "%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: directionFactor * 100 + "%", opacity: 0 }}
                  transition={{
                    y: { type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.75, delay: i * 0.05 },
                    opacity: { duration: 0.6, delay: i * 0.03 }
                  }}
                  className="relative h-full overflow-hidden"
                  style={{ width: `${sliceWidth}%` }}
                >
                  <motion.div
                    className="absolute top-0 bottom-0 h-full transform-gpu will-change-transform"
                    initial={{ scale: 1.12 }}
                    animate={{ scale: 1.02 }}
                    transition={{ duration: 8, ease: "easeOut" }}
                    style={{ 
                      width: `${600}%`,
                      left: `-${i * 100}%` 
                    }}
                  >
                    <a href={slide.href || "#"} className="block w-full h-full relative">
                      <ResponsiveHeroImage slide={slide} current={current} />
                    </a>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Arrows */}
        <button
          onClick={prev}
          suppressHydrationWarning
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 size-10 sm:size-12 bg-black/30 border border-white/10 hover:border-[var(--color-gold)] backdrop-blur-md hover:bg-black/50 rounded-full flex items-center justify-center text-white hover:text-[var(--color-gold)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer shadow-lg group"
        >
          <AnimatedChevronLeft size={22} animateOn="hover" />
        </button>

        <button
          onClick={next}
          suppressHydrationWarning
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 size-10 sm:size-12 bg-black/30 border border-white/10 hover:border-[var(--color-gold)] backdrop-blur-md hover:bg-black/50 rounded-full flex items-center justify-center text-white hover:text-[var(--color-gold)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer shadow-lg group"
        >
          <AnimatedChevronRight size={22} animateOn="hover" />
        </button>

        {/* Auto-slide Progress Bar */}
        {activeSlides.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20 overflow-hidden">
            <div
              className="h-full bg-[var(--color-gold)] shadow-[0_0_8px_var(--color-gold)] transition-transform"
              style={{
                width: '100%',
                transformOrigin: 'left',
                animation: 'hero-progress 8s linear infinite',
                animationPlayState: isHovered ? 'paused' : 'running',
              }}
              key={current}
            />
          </div>
        )}
      </div>
    </section>
  );
}
