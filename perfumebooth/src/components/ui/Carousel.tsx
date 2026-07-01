"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { EmblaOptionsType, EmblaPluginType } from "embla-carousel";
import Autoplay from "embla-carousel-autoplay";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
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

export default function Carousel({
  children,
  options = { align: "start", containScroll: "trimSnaps" },
  plugins = [],
  autoplay = false,
  autoplayDelay = 4000,
  showArrows = true,
  showDots = false,
  className,
  containerClassName,
  slideClassName,
  onSelect,
}: CarouselProps) {
  const defaultPlugins = [WheelGesturesPlugin()];
  const allPlugins = [...defaultPlugins, ...plugins];
  if (autoplay) {
    allPlugins.push(Autoplay({ delay: autoplayDelay, stopOnInteraction: false }) as any);
  }

  const [emblaRef, emblaApi] = useEmblaCarousel(options, allPlugins);

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelectHandler = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
    if (onSelect) onSelect(index);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelectHandler();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelectHandler);
    emblaApi.on("reInit", onSelectHandler);
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
                "h-1.5 rounded-full ",
                index === selectedIndex ? "w-6 bg-[var(--color-gold)]" : "w-1.5 bg-[var(--color-gold)]/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
