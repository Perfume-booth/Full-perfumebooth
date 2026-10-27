"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import type { Product } from "@/app/products/[slug]/page";

type Variant = NonNullable<Product["variants"]>[number];
const VariantContext = createContext<{
  selectedVariant: Variant | null;
  setSelectedVariant: (variant: Variant | null) => void;
} | null>(null);

export function ProductVariantProvider({ product, children }: { product: Product; children: ReactNode }) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  return <VariantContext.Provider value={{ selectedVariant, setSelectedVariant }}>{children}</VariantContext.Provider>;
}

export function useProductVariant() {
  const context = useContext(VariantContext);
  if (!context) throw new Error("Product variant provider is missing");
  return context;
}

export function ProductVariantSelector({ product }: { product: Product }) {
  const { selectedVariant, setSelectedVariant } = useProductVariant();
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Mouse drag-to-scroll implementation for touch sense on desktop
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const isDraggingRef = useRef(false);

  const isSelected = (variant: Variant) =>
    variant.id ? selectedVariant?.id === variant.id : selectedVariant?.title === variant.title;

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, product.variants]);

  // Center selected card in the carousel track when changed
  useEffect(() => {
    if (!selectedVariant) return;
    const key = String(selectedVariant.id || selectedVariant.title);
    const el = cardRefs.current[key];
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedVariant]);

  if (!product.variants?.length) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isDownRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDownRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      isDraggingRef.current = true;
    }
    el.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDownRef.current = false;
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  return (
    <div id="product-variants" className="w-full pt-2 pb-1 border-t border-[var(--color-border)]/50 mt-1.5" data-testid="product-variants">
      <button type="button" onClick={() => setSelectedVariant(null)} aria-pressed={!selectedVariant} className="text-[11px] underline mb-1.5 text-[var(--color-text-muted)] hover:text-black block">
        View main product
      </button>
      {/* Header with Touch Sense Hint */}
      <div className="flex items-center justify-between mb-1.5 select-none">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-gold)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]"></span>
          {product.variants.length} {product.variants.length === 1 ? "Edition" : "Editions"}
        </span>
        <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-text-muted,#737373)] flex items-center gap-1 opacity-75">
          <span>Swipe to explore</span>
          <span className="tracking-widest text-[12px] opacity-70">↔</span>
        </span>
      </div>

      {/* Horizontal Carousel Track with Subtle Overflow Fade */}
      <div className="relative group/track">
        {/* Left edge shadow indicator */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--color-bg,#ffffff)] via-[var(--color-bg,#ffffff)]/80 to-transparent z-10 pointer-events-none rounded-l-2xl"></div>
        )}

        {/* Scrollable Touch-Sense Track */}
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          aria-label="Product variant options"
          role="radiogroup"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex items-stretch gap-2 sm:gap-2.5 overflow-x-auto scroll-smooth snap-x snap-mandatory overscroll-x-contain touch-pan-x cursor-grab active:cursor-grabbing select-none py-1 px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {product.variants.map((variant, index) => {
            const selected = isSelected(variant);
            const imgKey = String(variant.id || index);
            const variantImage = failedImages[imgKey]
              ? (product.image || product.images?.[0]?.image)
              : (variant.image || product.images?.[index]?.image || product.image);
            const priceNum = parseFloat(String(variant.price || 0));
            const compareNum = variant.compareAtPrice ? parseFloat(String(variant.compareAtPrice)) : 0;
            const hasDiscount = compareNum > priceNum;
            const discountPercent = hasDiscount ? Math.round(((compareNum - priceNum) / compareNum) * 100) : 0;
            const isAvailable = variant.availableForSale !== false && (variant.quantityAvailable === undefined || variant.quantityAvailable > 0);

            return (
              <button
                key={variant.id || index}
                ref={(el) => {
                  cardRefs.current[String(variant.id || variant.title)] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  if (isDraggingRef.current) return;
                  setSelectedVariant(variant);
                }}
                className={`group relative flex flex-col items-center p-1.5 sm:p-2 rounded-xl border text-center transition-all duration-300 snap-start shrink-0 w-[102px] sm:w-[118px] md:w-[124px] cursor-pointer select-none ${
                  selected
                    ? "border-[#b8924a] bg-gradient-to-b from-[#b8924a]/12 via-[#b8924a]/4 to-white ring-2 ring-[#b8924a] ring-offset-2 shadow-md"
                    : "border-[var(--color-border)]/80 bg-white hover:border-[#b8924a]/60 hover:bg-[#faf8f5]/60 hover:shadow-xs"
                } ${!isAvailable ? "opacity-60" : ""}`}
              >
                {/* Active Gold Check Badge */}
                {selected && (
                  <span className="absolute top-2 right-2 z-10 size-4 rounded-full bg-[#b8924a] text-white flex items-center justify-center shadow-xs">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}

                {/* Discount Badge */}
                {discountPercent > 0 && (
                  <span className="absolute top-2 left-2 z-10 text-[9px] font-extrabold text-[#b03a2e] bg-[#b03a2e]/10 px-1.5 py-0.2 rounded-md">
                    {discountPercent}%
                  </span>
                )}

                {/* Variant Thumbnail Bottle Image */}
                <div className="relative size-14 sm:size-16 rounded-lg overflow-hidden bg-[#faf8f5] border border-black/5 shrink-0 flex items-center justify-center mb-1">
                  {variantImage ? (
                    <Image
                      src={variantImage}
                      alt={variant.title || product.title}
                      width={80}
                      height={80}
                      unoptimized
                      onError={() => setFailedImages((prev) => ({ ...prev, [imgKey]: true }))}
                      className="object-contain w-full h-full p-1.5 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-[11px] text-gray-400 font-serif font-bold">PB</span>
                  )}
                </div>

                {/* Variant Name */}
                <p className={`text-xs font-bold truncate w-full ${selected ? "text-[#8a6828]" : "text-gray-900 group-hover:text-black"}`} title={variant.title}>
                  {variant.title || variant.option1_value}
                </p>

                {variant.option2_value && (
                  <p className="text-[10px] text-gray-500 truncate w-full -mt-0.5">
                    {variant.option2_value}
                  </p>
                )}

                {/* Price Display */}
                <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                  <span className="text-xs font-extrabold text-gray-900">
                    Rs. {variant.price}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] text-gray-400 line-through">
                      Rs. {variant.compareAtPrice}
                    </span>
                  )}
                </div>

                {/* Out of stock badge */}
                {!isAvailable && (
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                    Sold Out
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right edge shadow indicator */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--color-bg,#ffffff)] via-[var(--color-bg,#ffffff)]/80 to-transparent z-10 pointer-events-none rounded-r-2xl"></div>
        )}
      </div>
    </div>
  );
}
