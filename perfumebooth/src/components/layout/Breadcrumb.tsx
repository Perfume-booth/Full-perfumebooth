"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCollection } from "@/components/product/useCollection";



interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  title?: string;
  totalProducts?: number;
}



export default function Breadcrumb({ items, title, totalProducts: propTotalProducts }: BreadcrumbProps) {
  const pathname = usePathname();

  // Try to get totalProducts from CollectionContext if available
  let contextTotalProducts: number | undefined;
  try {
    const collection = useCollection();
    contextTotalProducts = collection.totalCount;
  } catch (e) {
    // Not within a CollectionContext
  }

  const totalProducts = contextTotalProducts !== undefined ? contextTotalProducts : propTotalProducts;

  // Default breadcrumbs if not provided
  const pathSegments = pathname.split("/").filter(Boolean);

  const defaultItems = (() => {
    // Filter out "collections" and "brands" segments from the breadcrumb trail
    const filtered = pathSegments.filter(
      (seg) => seg.toLowerCase() !== "collections" && seg.toLowerCase() !== "brands"
    );

    // Build items from the remaining segments
    const mappedItems = filtered.map((segment, index) => {
      // Reconstruct the actual href using the original pathSegments
      const originalIndex = pathSegments.indexOf(segment);
      const href = "/" + pathSegments.slice(0, originalIndex + 1).join("/");

      const label = segment
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      return { label, href };
    });

    return mappedItems;
  })();

  const allItems = items || defaultItems;

  return (
    <div className="relative mx-auto pb-2  px-4  text-[10px] uppercase tracking-[0.2em] text-[#8a7968] font-bold bg-gradient-to-r from-[#b8924a]/10 via-transparent to-[#b8924a]/10 border-b border-gray-100 hidden md:block">
      <div className="flex flex-col md:flex-row items-center justify-between p-3">
        <div className="hidden md:flex flex-wrap items-center order-2 md:order-1 ">
          <Link
            href="/"
            className="hover:text-[var(--color-text-primary)] transition-colors duration-300"
          >
            Home
          </Link>
          <span className="mx-2 md:mx-3 opacity-50">/</span>
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;
  
            return (
              <div key={`${item.href}-${index}`} className="flex items-center">
                {isLast ? (
                  <span className="text-[var(--color-text-primary)] truncate max-w-[150px] md:max-w-none">
                    {item.label}
                  </span>
                ) : (
                  <>
                    <Link
                      href={item.href}
                      className="hover:text-[var(--color-text-primary)] transition-colors duration-300"
                    >
                      {item.label}
                    </Link>
                    <span className="mx-2 md:mx-3 opacity-50">/</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {title && (
          <div className="flex flex-col items-center gap-1 order-1 md:order-2 justify-end">
            <h3 className="text-xl font-serif text-[var(--color-gold)] text-center tracking-widest uppercase mb-0 leading-none">
              {title}
            </h3>
            {totalProducts !== undefined && totalProducts > 0 && (
              <span className="text-[9px] text-[#807667] tracking-[0.3em] font-medium uppercase mt-1">
                {totalProducts} PRODUCTS
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
