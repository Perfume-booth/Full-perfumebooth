"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { AnimatedChevronLeft as ChevronLeft } from "@/components/ui/icons/AnimatedChevronLeft";
import { AnimatedChevronRight as ChevronRight } from "@/components/ui/icons/AnimatedChevronRight";

interface ProductGalleryProps {
  images: { id: number; image: string; alt_text: string }[];
  title: string;
}

export default function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ display: "none", transformOrigin: "center", transform: "scale(1)" });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 30 },
    [WheelGesturesPlugin()]
  );

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square bg-gray-50 flex items-center justify-center border border-[var(--color-border)]">
        <span className="text-gray-400 text-sm uppercase tracking-widest">No Image Available</span>
      </div>
    );
  }

  const activeImage = images[activeIndex];

  // Logic for the "Flipkart-style" hover zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;

    setZoomStyle({
      display: "block",
      transformOrigin: `${x}% ${y}%`,
      transform: "scale(1.8)",
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: "none", transformOrigin: "center", transform: "scale(1)" });
  };

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4 lg:gap-8 w-full h-full self-start">
      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          className="hidden md:flex flex-col gap-3.5 overflow-y-hidden w-18 max-h-[500px] scrollbar-hide py-2 px-0.5 snap-y snap-mandatory"
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollTo(idx)}
              className={`relative flex-shrink-0 w-14 h-14 transition-all duration-500 overflow-hidden snap-center rounded-xl border ${activeIndex === idx
                ? "ring-2 ring-[#b8924a] ring-offset-2 border-transparent opacity-100"
                : "border-[var(--color-border)] opacity-60 hover:opacity-100 hover:border-[#b8924a] grayscale hover:grayscale-0"
                }  shadow-sm`}
              suppressHydrationWarning
            >
              <Image
                src={img.image}
                alt={img.alt_text || `${title} thumbnail ${idx + 1}`}
                fill
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image Slider */}
      <div className="relative flex-grow group aspect-square w-full max-w-[500px] max-h-[500px] mx-auto overflow-hidden bg-white border border-[var(--color-border)]/40">
        <div className="overflow-hidden h-full w-full" ref={emblaRef}>
          <div className="flex h-full">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative flex-[0_0_100%] min-w-0 h-full flex items-center justify-center cursor-zoom-in overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <div className="relative w-full h-full p-0">
                  <Image
                    src={img.image}
                    alt={img.alt_text || title}
                    fill
                    className="object-contain mix-blend-multiply transition-transform duration-300 ease-out"
                    style={activeIndex === idx ? {
                      transformOrigin: zoomStyle.transformOrigin,
                      transform: zoomStyle.transform
                    } : {}}
                    sizes="(max-width: 768px) 100vw, 80vw"
                    priority={idx === 0}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows - Premium Fine Line Style */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-10 size-12 bg-white/20 hover:bg-white backdrop-blur-xl rounded-full flex items-center justify-center text-black border border-white/40 transition-all duration-500 opacity-0 group-hover:opacity-100 hidden md:flex hover:scale-110"
              aria-label="Previous image"
              suppressHydrationWarning
            >
              <ChevronLeft size={20} strokeWidth={1.5} animateOn="hover" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-10 size-12 bg-white/20 hover:bg-white backdrop-blur-xl rounded-full flex items-center justify-center text-black border border-white/40 transition-all duration-500 opacity-0 group-hover:opacity-100 hidden md:flex hover:scale-110"
              aria-label="Next image"
              suppressHydrationWarning
            >
              <ChevronRight size={20} strokeWidth={1.5} animateOn="hover" />
            </button>
          </>
        )}

        {/* Circle Pagination (Dots) - Both Mobile and Desktop */}
        {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
            {scrollSnaps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollTo(idx)}
                className={`transition-all duration-300 rounded-full ${activeIndex === idx
                    ? "w-8 h-1.5 bg-[#b8924a]"
                    : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-500"
                  }`}
                aria-label={`Go to slide ${idx + 1}`}
                suppressHydrationWarning
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}