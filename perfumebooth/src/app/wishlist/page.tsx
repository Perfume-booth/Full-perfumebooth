"use client";
import { useWishlist } from "@/store/useWishlist";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatedHeart as Heart } from "@/components/ui/icons/AnimatedHeart";
import { AnimatedX } from "@/components/ui/icons/AnimatedX";
import ProductCard from "@/components/product/ProductCard";
import { toast } from "react-hot-toast";

import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function WishlistPage() {
  const { items, removeItem, addItem } = useWishlist();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loggedIn = Cookies.get("isLoggedIn") === "true";
    if (!loggedIn) {
      router.push(`/auth?mode=signin&returnUrl=/wishlist`);
      return;
    }

    setIsMounted(true);

    // Check if we have a pending wishlist item from a guest session that just logged in
    const pendingProductStr = localStorage.getItem("pending_wishlist_product");
    if (pendingProductStr) {
      try {
        const pendingProduct = JSON.parse(pendingProductStr);
        if (pendingProduct && pendingProduct.id) {
          addItem(pendingProduct);
          toast.success(`"${pendingProduct.title}" saved to your wishlist!`);
        }
      } catch (err) {
        console.error("Failed to parse pending wishlist product:", err);
      } finally {
        localStorage.removeItem("pending_wishlist_product");
      }
    }
  }, [addItem, router]);

  // Remove early return to prevent full page layout shift
  // if (!isMounted) return null;

  return (
    <main className="pt-28 md:pt-36 pb-24 max-w-7xl mx-auto px-4 sm:px-6 font-sans min-h-[70vh]">

        {/* ── Header ── */}
        <div className="flex flex-col items-center mb-10 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-serif text-[#111] mb-3">My Wishlist</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-bold">
            {items.length} {items.length === 1 ? "Item" : "Items"}
          </p>
        </div>

        {/* ── Grid — same breakpoints as collection page ── */}
        {!isMounted ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] bg-neutral-100 animate-pulse rounded-2xl w-full"></div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 bg-[#fcfcfc] border border-[var(--color-border)] rounded-2xl flex flex-col items-center">
            <Heart className="w-12 h-12 text-gray-200 mb-6" strokeWidth={1} animateOn="view" />
            <p className="text-[var(--color-text-muted)] font-serif text-xl mb-2">Your wishlist is empty.</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-8 max-w-md">
              Save your favourite perfumes here to revisit them later.
            </p>
            <Link
              href="/all"
              className="bg-black text-white px-8 py-3.5 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[var(--color-maroon)] transition-colors rounded-full"
            >
              Explore Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {items.map((item) => {
              // Create a minimal product object that normalizeProduct will accept
              const productForCard = {
                id: item.id,
                title: item.title,
                handle: item.handle,
                image: item.image,
                price: item.price,
                availableForSale: true,
              };

              return (
                <div key={item.id} className="relative">
                  {/* ── Remove button overlay ── */}
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove from Wishlist"
                    className="absolute top-2 right-2 z-30 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-maroon)] transition-colors"
                  >
                    <AnimatedX size={12} />
                  </button>

                  {/* ── Standard ProductCard ── */}
                  <ProductCard product={productForCard} />
                </div>
              );
            })}
          </div>
        )}

        {/* ── Continue Shopping ── */}
        {items.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/all"
              className="inline-block border border-[#1a1410] text-[#1a1410] px-8 py-3 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#1a1410] hover:text-white transition-colors rounded-full"
            >
              Continue Shopping
            </Link>
          </div>
        )}

      </main>
  );
}