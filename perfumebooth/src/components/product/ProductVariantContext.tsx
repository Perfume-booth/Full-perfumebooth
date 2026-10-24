"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import type { Product } from "@/app/products/[slug]/page";

type Variant = NonNullable<Product["variants"]>[number];
const VariantContext = createContext<{
  selectedVariant: Variant | null;
  setSelectedVariant: (variant: Variant) => void;
} | null>(null);

export function ProductVariantProvider({ product, children }: { product: Product; children: ReactNode }) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(product.variants?.[0] ?? null);
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
  if (!product.variants?.length || product.variants.length <= 1) return null;

  const first = product.variants[0];
  const optionLabel = [first.option1_name, first.option2_name].filter(Boolean).join(" / ") || "Edition & Size";

  const isSelected = (variant: Variant) =>
    variant.id ? selectedVariant?.id === variant.id : selectedVariant?.title === variant.title;

  return (
    <div className="w-full pt-4 pb-2 border-t border-[var(--color-border)]/60 mt-4" data-testid="product-variants">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--color-gold)] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]"></span>
          Select {optionLabel}
        </span>
        {selectedVariant && (
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
            Active: <strong className="text-gray-900 font-bold">{selectedVariant.title}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
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
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSelectedVariant(variant)}
              className={`group relative flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all duration-300 ${
                selected
                  ? "border-[#b8924a] bg-gradient-to-br from-[#b8924a]/15 via-[#b8924a]/5 to-white ring-2 ring-[#b8924a] ring-offset-2 shadow-md"
                  : "border-[var(--color-border)] bg-white/90 hover:border-[#b8924a]/60 hover:bg-white hover:shadow-sm"
              } ${!isAvailable ? "opacity-60" : ""}`}
            >
              {/* Variant Thumbnail Image */}
              <div className="relative size-12 md:size-14 rounded-xl overflow-hidden bg-[#faf8f5] border border-black/5 shrink-0 flex items-center justify-center">
                {variantImage ? (
                  <Image
                    src={variantImage}
                    alt={variant.title || product.title}
                    width={56}
                    height={56}
                    unoptimized
                    onError={() => setFailedImages((prev) => ({ ...prev, [imgKey]: true }))}
                    className="object-contain w-full h-full p-1 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-[10px] text-gray-400 font-serif">PB</span>
                )}
              </div>

              {/* Variant Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs font-bold truncate ${selected ? "text-[#8a6828]" : "text-gray-900 group-hover:text-black"}`}>
                    {variant.title || variant.option1_value}
                  </p>
                  {selected && (
                    <span className="shrink-0 size-4 rounded-full bg-[#b8924a] text-white flex items-center justify-center">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </div>

                {variant.option2_value && (
                  <p className="text-[10px] text-gray-500 truncate -mt-0.5">
                    {variant.option1_value} • {variant.option2_value}
                  </p>
                )}

                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xs font-extrabold text-gray-900">
                    Rs. {variant.price}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] text-gray-400 line-through">
                      Rs. {variant.compareAtPrice}
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-[9px] font-bold text-[#b03a2e]">
                      {discountPercent}% off
                    </span>
                  )}
                </div>

                {!isAvailable && (
                  <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                    Sold Out
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
