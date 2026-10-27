"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { AnimatedChevronLeft as ChevronLeft } from "@/components/ui/icons/AnimatedChevronLeft";
import { AnimatedChevronRight as ChevronRight } from "@/components/ui/icons/AnimatedChevronRight";
import { useProductVariant } from "./ProductVariantContext";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { AnimatedShare2 as Share2 } from "@/components/ui/icons/AnimatedShare2";
import { AnimatedHeart as Heart } from "@/components/ui/icons/AnimatedHeart";
import { useWishlist } from "@/store/useWishlist";
import type { Product } from "@/app/products/[slug]/page";
import { normalizeProduct, toStoreProduct } from "@/lib/transformers";

interface ProductGalleryProps {
  images: { id: number; image: string; alt_text: string }[];
  title: string;
  product?: Product;
  children?: ReactNode;
}

export default function ProductGallery({ images, title, product, children }: ProductGalleryProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();
  const { isInWishlist, addItem, removeItem } = useWishlist();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isWishlisted = product ? isInWishlist(product.id.toString()) : false;

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product) return;
    if (isWishlisted) {
      removeItem(product.id.toString());
    } else {
      const isLoggedIn = Cookies.get("isLoggedIn") === "true";
      if (!isLoggedIn) {
        const normalized = normalizeProduct(product);
        localStorage.setItem("pending_wishlist_product", JSON.stringify(toStoreProduct(normalized)));
        router.push("/auth?mode=signin&returnUrl=/wishlist");
        return;
      }
      const normalized = normalizeProduct(product);
      addItem(toStoreProduct(normalized) as any);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: title || product?.title || "PerfumeBooth",
      text: `Check out ${title || product?.title} at The Scent of Silence`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Ignored or user cancelled
      }
    } else if (typeof window !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ display: "none", transformOrigin: "center", transform: "scale(1)" });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 30 },
    [WheelGesturesPlugin()]
  );

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const { selectedVariant } = useProductVariant();

  // Switch main gallery image when selected variant changes
  useEffect(() => {
    if (!emblaApi) return;
    if (!selectedVariant) {
      emblaApi.scrollTo(0);
      setActiveIndex(0);
      return;
    }

    if (selectedVariant.image) {
      const idx = images.findIndex((img) => img.image === selectedVariant.image);
      if (idx !== -1) {
        emblaApi.scrollTo(idx);
        setActiveIndex(idx);
        return;
      }
    }

    if (selectedVariant.title) {
      const vTitle = selectedVariant.title.toLowerCase();
      const altIdx = images.findIndex(
        (img) => img.alt_text && img.alt_text.toLowerCase().includes(vTitle)
      );
      if (altIdx !== -1) {
        emblaApi.scrollTo(altIdx);
        setActiveIndex(altIdx);
        return;
      }
    }

    if (selectedVariant.option1_value) {
      const optVal = selectedVariant.option1_value.toLowerCase();
      const optIdx = images.findIndex(
        (img) => img.alt_text && img.alt_text.toLowerCase().includes(optVal)
      );
      if (optIdx !== -1) {
        emblaApi.scrollTo(optIdx);
        setActiveIndex(optIdx);
      }
    }
  }, [selectedVariant, emblaApi, images]);

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
    return () => { emblaApi.off("select", onSelect); emblaApi.off("reInit", onSelect); };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  if (!images || images.length === 0) {
    return (
      <div className="space-y-5"><div className="w-full aspect-square bg-gray-50 flex items-center justify-center border border-[var(--color-border)]">
        <span className="text-gray-400 text-sm uppercase tracking-widest">No Image Available</span>
      </div>{children}</div>
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
    <div className={`grid gap-3 md:gap-5 w-full items-start ${images.length > 1 ? "grid-cols-1 md:grid-cols-[4.5rem_minmax(0,1fr)]" : "grid-cols-1"}`}>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div aria-label="Product images" className="hidden md:flex flex-col gap-3 overflow-y-auto min-h-0 max-h-[min(65vw,500px)] py-1 px-1 snap-y snap-mandatory no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollTo(idx)}
              aria-label={`View product image ${idx + 1}`}
              aria-pressed={activeIndex === idx}
              className={`relative flex-shrink-0 w-full aspect-square transition-all duration-500 overflow-hidden snap-center rounded-xl border ${activeIndex === idx
                ? "ring-2 ring-[#b8924a] ring-offset-2 border-transparent opacity-100"
                : "border-[var(--color-border)] opacity-60 hover:opacity-100 hover:border-[#b8924a] grayscale hover:grayscale-0"
                }  shadow-sm`}
              suppressHydrationWarning
            >
              <Image
                src={img.image}
                alt={img.alt_text || `${title} thumbnail ${idx + 1}`}
                fill
                sizes="64px"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image Slider */}
      <div className="min-w-0 w-full max-w-[500px] mx-auto space-y-2.5">
      <div data-testid="product-main-image" className="relative group aspect-square w-full overflow-hidden bg-white border border-[var(--color-border)]/50 rounded-2xl md:rounded-xl shadow-xs">
        {/* Floating Top-Right Wishlist & Share Action Buttons */}
        {product && (
          <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
            {/* Share Button */}
            <div className="relative">
              <button
                type="button"
                onClick={handleShare}
                aria-label={isCopied ? "Link copied to clipboard" : `Share ${title}`}
                className="size-9 sm:size-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-black border border-black/10 shadow-md backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                title="Share"
              >
                <Share2 size={16} animateOn="hover" />
              </button>
              {isCopied && (
                <span className="absolute -bottom-8 right-0 bg-black/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap animate-fade-in pointer-events-none">
                  Copied!
                </span>
              )}
            </div>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={toggleWishlist}
              aria-label={isMounted && isWishlisted ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
              className={`size-9 sm:size-10 flex items-center justify-center rounded-full border shadow-md backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                isMounted && isWishlisted
                  ? "bg-white/95 border-[#b03a2e]/40 text-[#b03a2e]"
                  : "bg-white/90 hover:bg-white border-black/10 text-gray-700 hover:text-[#b03a2e]"
              }`}
              title={isMounted && isWishlisted ? "In Wishlist" : "Add to Wishlist"}
              suppressHydrationWarning
            >
              <Heart
                size={17}
                animateOn="click"
                className={isMounted && isWishlisted ? "fill-[#b03a2e] text-[#b03a2e]" : ""}
              />
            </button>
          </div>
        )}

        {/* Mobile Slide Counter (Top-Left) */}
        {images.length > 1 && (
          <div className="md:hidden absolute top-3.5 left-3.5 z-10 text-[10px] font-bold bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full shadow-sm">
            {activeIndex + 1} / {images.length}
          </div>
        )}
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
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 500px"
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
      {children}
      </div>
    </div>
  );
}
