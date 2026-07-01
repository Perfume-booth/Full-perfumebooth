"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import ProductCard from "@/components/product/ProductCard";
import { CollectionSkeleton } from "@/components/ui/CollectionSkeleton";
import { useCollection } from "./useCollection";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Product } from "@/types/product";
import { trackViewItemList } from "@/lib/analytics";

export default function CollectionProductGrid() {
  const {
    products,
    isLoadingMore,
    isFiltering,
    pageInfo,
    handleLoadMore,
    title,
  } = useCollection();

  const observerTarget = useRef<HTMLDivElement>(null);

  // Track collection view (view_item_list)
  useEffect(() => {
    if (!isFiltering && products.length > 0) {
      trackViewItemList(products, title);
    }
  }, [title, isFiltering, products.length === 0]);

  const [cols, setCols] = useState(2);
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1280) setCols(4);
      else if (width >= 1024) setCols(3);
      else setCols(2);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const rows = useMemo(() => {
    const res: Product[][] = [];
    for (let i = 0; i < products.length; i += cols) {
      res.push(products.slice(i, i + cols));
    }
    return res;
  }, [products, cols]);

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth < 640) return 336; // Mobile (320 + 16 gap)
        if (window.innerWidth < 1024) return 424; // Tablet (400 + 24 gap)
      }
      return 474; // Desktop (450 + 24 gap)
    },
    overscan: 5,
  });

  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !pageInfo.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [handleLoadMore, pageInfo.hasNextPage, isLoadingMore]);

  return (
    <div className="flex-1 min-w-0">

      {isFiltering ? (
        <CollectionSkeleton count={8} />
      ) : products.length === 0 ? (
        <div className="py-32 text-center flex flex-col items-center">
          <p className="italic serif text-2xl text-[#807667] mb-8">No fragrances match your selection.</p>
        </div>
      ) : (
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowProducts = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0 pb-4 md:pb-6"
              >
                {rowProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* INFINITE SCROLL TARGET */}
      <div
        ref={observerTarget}
        className="mt-8 py-12 flex flex-col items-center justify-center min-h-[100px]"
      >
        {pageInfo.hasNextPage ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-6 h-6 border-2 border-[#b8924a]/20 border-t-[#b8924a] rounded-full animate-spin" />
            <span className="text-[9px] uppercase tracking-[0.3em] text-[#b8924a] font-bold">Discovering More...</span>
          </div>
        ) : products.length > 0 && (
          <div className="flex flex-col items-center opacity-40">
            <div className="w-12 h-[0.5px] bg-[#b8924a] mb-4" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#807667]">End of Collection</span>
          </div>
        )}
      </div>
    </div>
  );
}
