"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { EmblaOptionsType, EmblaPluginType } from "embla-carousel";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarouselProps {
  children: React.ReactNode;
  options?: EmblaOptionsType;
  plugins?: EmblaPluginType[];
  autoplay?: boolean;
  autoplayDelay?: number;
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
  containerClassName?: string;
  slideClassName?: string;
  onSelect?: (index: number) => void;
}

const DEFAULT_OPTIONS: EmblaOptionsType = { align: "start", containScroll: "trimSnaps" };
const NO_PLUGINS: EmblaPluginType[] = [];

export default function Carousel({
  children,
  options = DEFAULT_OPTIONS,
  plugins = NO_PLUGINS,
  autoplay = false,
  autoplayDelay = 4000,
  showArrows = true,
  showDots = false,
  className,
  containerClassName,
  slideClassName,
  onSelect,
}: CarouselProps) {
  // Memoize options by value to prevent unnecessary Embla re-inits when callers pass inline objects
  const optionsKey = JSON.stringify(options);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedOptions = useMemo(() => options, [optionsKey]);

  // Plugin instances hold state. Recreating them on every render forces Embla to teardown/setup.
  const autoplayPlugin = useMemo(() => {
    if (!autoplay) return null;
    return Autoplay({ delay: autoplayDelay, stopOnInteraction: false }) as EmblaPluginType;
  }, [autoplay, autoplayDelay]);

  const allPlugins = useMemo(() => {
    const list = [...plugins];
    if (autoplayPlugin) list.push(autoplayPlugin);
    return list;
  }, [plugins, autoplayPlugin]);

  const [emblaRef, emblaApi] = useEmblaCarousel(memoizedOptions, allPlugins);

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  // Keep a stable ref to onSelect to decouple it from onSelectHandler's dependency tree
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const lastIndexRef = useRef<number>(-1);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelectHandler = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();

    // Guard state updates against no-op changes to prevent infinite update depth
    setSelectedIndex((prev) => (prev !== index ? index : prev));

    const canPrev = emblaApi.canScrollPrev();
    setPrevBtnEnabled((prev) => (prev !== canPrev ? canPrev : prev));

    const canNext = emblaApi.canScrollNext();
    setNextBtnEnabled((prev) => (prev !== canNext ? canNext : prev));

    if (lastIndexRef.current !== index) {
      lastIndexRef.current = index;
      if (onSelectRef.current) {
        onSelectRef.current(index);
      }
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    onSelectHandler();
    setScrollSnaps(emblaApi.scrollSnapList());

    emblaApi.on("select", onSelectHandler);
    emblaApi.on("reInit", onSelectHandler);

    return () => {
      emblaApi.off("select", onSelectHandler);
      emblaApi.off("reInit", onSelectHandler);
    };
  }, [emblaApi, onSelectHandler]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      scrollPrev();
    } else if (e.key === "ArrowRight") {
      scrollNext();
    }
  }, [scrollPrev, scrollNext]);

  return (
    <div 
      className={cn("relative group outline-none", className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Product image carousel"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className={cn("flex py-8 -my-8 px-1", containerClassName)}>
          {React.Children.map(children, (child) => (
            <div 
              className={cn("flex-[0_0_auto] min-w-0", slideClassName)}
              role="group"
              aria-roledescription="slide"
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {showArrows && (
        <>
          <button
            onClick={scrollPrev}
            disabled={!prevBtnEnabled}
            aria-label="Previous slide"
            className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur border border-[var(--color-border)] rounded-full shadow-lg hidden md:flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] transition-all duration-300 disabled:opacity-0"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={scrollNext}
            disabled={!nextBtnEnabled}
            aria-label="Next slide"
            className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur border border-[var(--color-border)] rounded-full shadow-lg hidden md:flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] transition-all duration-300 disabled:opacity-0"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {showDots && (
        <div className="flex justify-center gap-2 mt-6">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === selectedIndex ? "w-6 bg-[var(--color-gold)]" : "w-1.5 bg-[var(--color-gold)]/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
