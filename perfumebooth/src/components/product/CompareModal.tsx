"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCompareStore } from "@/store/useCompareStore";
import { AnimatedX } from "@/components/ui/icons/AnimatedX";
import { AnimatedStar } from "@/components/ui/icons/AnimatedStar";
import { AnimatedShoppingCart } from "@/components/ui/icons/AnimatedShoppingCart";
import { AnimatedGitCompare } from "@/components/ui/icons/AnimatedGitCompare";
import { useCartStore } from "@/store/useCartStore";

import { Product } from "@/types/product";
import { getBrandFromTags } from "@/lib/transformers";

export default function CompareModal() {
  const { items, isOpen, closeCompare, removeItem } = useCompareStore();
  const { addToCart, openCart } = useCartStore();

  React.useEffect(() => {
    if (!isOpen || items.length === 0) return;

    // Check if any items are missing comparison details or tags (e.g. legacy cached items)
    const needsFetch = items.some(item => !item.isFull || item.tags === undefined);
    
    if (needsFetch) {
      const fetchFullDetails = async () => {
        try {
          const { getProductAction } = await import("@/lib/actions/actions");
          const updatedItems = await Promise.all(
            items.map(async (item) => {
              if (item.isFull && item.tags !== undefined) {
                return item;
              }
              const fullDetails = await getProductAction(item.handle);
              if (fullDetails) {
                return { ...item, ...fullDetails, isFull: true } as Product;
              }
              // Mark as full and ensure tags are defined to prevent endless retries on failure
              return { ...item, tags: item.tags || [], isFull: true } as Product;
            })
          );
          useCompareStore.setState({ items: updatedItems });
        } catch (err) {
          console.error("Error fetching compare product details:", err);
        }
      };
      fetchFullDetails();
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  interface Feature {
    label: string;
    key: keyof Product;
    render?: (val: any, item: Product) => React.ReactNode;
  }

  const features: Feature[] = [
    { 
      label: "Price", 
      key: "price", 
      render: (val: string | number) => `₹${parseFloat(val.toString()).toLocaleString()}` 
    },
    { 
      label: "Brand", 
      key: "brand", 
      render: (val: any, item: Product) => {
        const brandName = getBrandFromTags(item.tags) || item.brand || "";
        const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-');
        return (
          <Link href={`/${brandSlug}`} className="hover:underline">
            {brandName}
          </Link>
        );
      }
    },
    { label: "Category", key: "productType" },
    { label: "Ideal For", key: "gender" },
    { 
      label: "Size", 
      key: "size_ml", 
      render: (val: string) => {
        if (!val) return "—";
        const trimmed = val.toString().trim();
        if (trimmed.toLowerCase().endsWith("ml")) {
          return trimmed.toUpperCase();
        }
        return `${trimmed}ML`;
      }
    },
    { label: "Top Notes", key: "top_notes" },
    { label: "Middle Notes", key: "middle_notes" },
    { label: "Base Notes", key: "base_notes" },
    { 
      label: "Rating", 
      key: "rating", 
      render: (val: number) => (
        <div className="flex items-center gap-1 justify-center">
          <span className="font-bold">{val || 0}</span>
          <AnimatedStar size={12} fill="currentColor" className="text-[var(--color-gold)]" />
        </div>
      ) 
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-8"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={closeCompare} />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[2rem] shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-2xl font-serif text-[var(--color-text-primary)]">Compare Fragrances</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-bold mt-1">
                Comparing {items.length} items
              </p>
            </div>
            <button
              onClick={closeCompare}
              className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-black hover:text-white transition-all"
            >
              <AnimatedX size={20} />
            </button>
          </div>

          {/* Table Container */}
          <div className="flex-grow overflow-x-auto p-4 sm:p-8 custom-scrollbar">
            <div className="min-w-[800px]">
              {/* Product Info Row */}
              <div 
                className="grid gap-8 items-start mb-12 px-4 -mx-4"
                style={{ gridTemplateColumns: `200px repeat(${items.length}, minmax(200px, 1fr))` }}
              >
                <div className="pt-8 pt-4">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-300">Product</h4>
                </div>
                {items.map((item) => {
                  const image = item.image || (item as any).featuredImage?.url || "/placeholder-perfume.jpg";
                  const brandName = getBrandFromTags(item.tags) || item.brand || "";
                  const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-');
                  return (
                    <div key={item.id} className="flex flex-col items-center text-center space-y-4 group relative">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="absolute -top-2 -right-2 p-1.5 bg-neutral-100 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black hover:text-white transition-all z-10"
                      >
                        <AnimatedX size={12} />
                      </button>
                      <div className="w-40 h-40 relative rounded-3xl overflow-hidden bg-neutral-50 border border-neutral-100 p-6 mix-blend-multiply transition-transform duration-500 group-hover:scale-105">
                        <Image src={image} alt={item.title} fill className="object-contain p-4" />
                      </div>
                      <div>
                        <Link href={`/${brandSlug}`} className="inline-block">
                          <span className="text-[9px] uppercase tracking-widest text-[var(--color-gold)] font-bold mb-1 opacity-80 hover:underline">
                            {brandName}
                          </span>
                        </Link>
                        <h3 className="text-sm leading-snug line-clamp-2 min-h-[2.5em]">
                          {item.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          addToCart(item, 1);
                          openCart();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-text-primary)] text-white text-[9px] uppercase tracking-widest font-bold rounded-xl hover:bg-[var(--color-maroon)] transition-all active:scale-95"
                      >
                        <AnimatedShoppingCart size={14} /> Add to Collection
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Feature Rows */}
              {features.map((feature, fIdx) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: fIdx * 0.05 }}
                  className="grid gap-8 py-5 border-t border-neutral-50 hover:bg-neutral-50 transition-colors rounded-xl px-4 -mx-4"
                  style={{ gridTemplateColumns: `200px repeat(${items.length}, minmax(200px, 1fr))` }}
                >
                  <div className="flex items-center">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400">
                      {feature.label}
                    </span>
                  </div>
                  {items.map((item) => {
                    const rawVal = (item as any)[feature.key];
                    let displayVal: React.ReactNode = "—";
                    if (rawVal !== undefined && rawVal !== null) {
                      if (feature.render) {
                        displayVal = feature.render(rawVal, item);
                      } else if (typeof rawVal === 'object' && 'value' in rawVal) {
                        displayVal = (rawVal.value as any) || "—";
                      } else if (typeof rawVal === 'object') {
                        displayVal = JSON.stringify(rawVal);
                      } else {
                        displayVal = rawVal || "—";
                      }
                    }
                    return (
                      <div key={item.id} className="text-center flex items-center justify-center">
                        <span className="text-[11px] font-medium text-[var(--color-text-primary)] leading-relaxed">
                          {displayVal}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer Warning */}
          {items.length === 0 && (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12">
               <AnimatedGitCompare size={48} className="text-neutral-200 mb-4" />
               <p className="text-neutral-400">Add at least two products to compare side-by-side.</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
