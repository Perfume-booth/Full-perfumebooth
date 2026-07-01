"use client";

import Image from "next/image";
import { motion, cubicBezier } from "framer-motion";
import Link from "next/link";
import { ShopifyCollection } from "@/lib/shopify/types";
import { AnimatedChevronRight } from "@/components/ui/icons";

interface CollectionsClientProps {
  collections: ShopifyCollection[];
}

// ─── Image metadata keyed by handle fragment ──────────────────────────────────
// type: "banner" = wide 4.66:1 JPEG scene photo  → object-cover, aspect-[21/9]
// type: "product" = ~1.18:1 PNG product shot      → object-contain, aspect-[5/4]
const FALLBACK_MAP: Record<string, { url: string; type: "banner" | "product" }> = {
  oud:     { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/OUD_jpg.jpg?v=1778239125",     type: "banner" },
  floral:  { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FLORAL_jpg.jpg?v=1778239125",  type: "banner" },
  citrus:  { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/CITRUS_jpg.jpg?v=1778239125",  type: "banner" },
  woody:   { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/WOODY_jpg.jpg?v=1778239125",   type: "banner" },
  spicy:   { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/SPICY_jpg.jpg?v=1778239125",   type: "banner" },
  aquatic: { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/AQUA_jpg.jpg?v=1778239125",    type: "banner" },
  oriental:{ url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/ORIENTAL_jpg.jpg?v=1778239125",type: "banner" },
  fresh:   { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/fresh.jpg?v=1778136299",        type: "banner" },
  men:     { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/OUD_jpg.jpg?v=1778239125",     type: "banner" },
  women:   { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FLORAL_jpg.jpg?v=1778239125",  type: "banner" },
  unisex:  { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/unisex.png?v=1780126452",      type: "banner" },
  mist:    { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mist.png?v=1778139272",        type: "product" },
  attar:   { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/attar.png?v=1778139272",       type: "product" },
  deo:     { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/deo_888a2919-741e-4acc-a2d1-692e69d8e819.png?v=1778139272", type: "product" },
  gift:    { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/gift-sets.png?v=1778139271",   type: "product" },
  scent:   { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/scent.png?v=1778139274",       type: "product" },
  perfume: { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/perfume.png?v=1778139272",     type: "product" },
};

const DEFAULT = { url: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/perfume.png?v=1778139272", type: "product" as const };

function getMedia(collection: ShopifyCollection): { url: string; type: "banner" | "product" } {
  // Shopify native collection image — detect type by checking if it's a jpg (wide banner) or png (product)
  if (collection.image?.url) {
    const url = collection.image.url;
    const isJpeg = url.includes(".jpg") || url.includes(".jpeg") || url.includes("_jpg");
    return { url, type: isJpeg ? "banner" : "product" };
  }
  const handle = collection.handle.toLowerCase();
  for (const key of Object.keys(FALLBACK_MAP)) {
    if (handle.includes(key)) return FALLBACK_MAP[key];
  }
  return DEFAULT;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: cubicBezier(0.22, 1, 0.36, 1) } },
};

// ─── Banner card (wide 4.66:1) — spans 2 columns, uses full-width panoramic view ─
function BannerCard({ collection, url }: { collection: ShopifyCollection; url: string }) {
  return (
    <Link
      href={`/${collection.handle}`}
      className="group relative block w-full overflow-hidden rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-500 bg-[#1a1410]"
    >
      {/* Exact native ratio: 2400×515 ≈ 21:4.5 → use aspect-[21/5] */}
      <div className="relative w-full" style={{ paddingBottom: "21.46%" /* 515/2400 */ }}>
        <Image
          src={url}
          alt={collection.title || "Collection Banner"}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 50vw"
        />
        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/20 to-transparent" />

        {/* Text */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-10">
         
          <h3 className="text-lg sm:text-2xl md:text-2xl font-serif text-white font-normal leading-tight group-hover:text-[#d4a96a] transition-colors duration-300">
            {collection.title}
          </h3>
          {collection.description && (
            <p className="text-[10px] sm:text-xs text-white/70 mt-1.5 line-clamp-1 font-light max-w-sm">
              {collection.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 text-white/80 group-hover:text-[#b8924a] transition-colors duration-300">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Explore</span>
            <AnimatedChevronRight size={12} />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Product card (~1.18:1) — standard grid cell, contains the product PNG cleanly ─
function ProductCard({ collection, url }: { collection: ShopifyCollection; url: string }) {
  return (
    <Link
      href={`/${collection.handle}`}
      className="group relative flex flex-col bg-white border border-[#ede8e0] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-[#b8924a]/40 transition-all duration-500"
    >
      {/* Exact native ratio: 880×744 ≈ 5:4.23 → use aspect-[5/4] */}
      <div className="relative w-full bg-[#f8f6f3] overflow-hidden" style={{ paddingBottom: "84.55%" /* 744/880 */ }}>
        <Image
          src={url}
          alt={collection.title || "Collection"}
          fill
          className="object-contain p-5 sm:p-6 transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {/* Subtle gold glow on hover */}
        <div className="absolute inset-0 bg-[#b8924a]/0 group-hover:bg-[#b8924a]/4 transition-colors duration-500 pointer-events-none" />
      </div>

      {/* Info bar */}
      <div className="p-3 md:p-4 flex items-center justify-between gap-2 border-t border-[#ede8e0] bg-white">
        <div className="min-w-0">
          <h3 className="text-[12px] sm:text-sm font-semibold text-[#1a1410] leading-tight truncate">
            {collection.title}
          </h3>
          {collection.description && (
            <p className="text-[9px] sm:text-[10px] text-[#807667] line-clamp-1 mt-0.5 leading-snug">
              {collection.description}
            </p>
          )}
        </div>
        <span className="shrink-0 w-7 h-7 rounded-full bg-[#f8f6f3] border border-[#ede8e0] flex items-center justify-center text-[#807667] group-hover:bg-[#b8924a] group-hover:border-[#b8924a] group-hover:text-white transition-all duration-300">
          <AnimatedChevronRight size={13} />
        </span>
      </div>
    </Link>
  );
}

// ─── Main grid ────────────────────────────────────────────────────────────────
export default function CollectionsGrid({ collections }: CollectionsClientProps) {
  return (
    <motion.div
      className="flex flex-col gap-4 md:gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Group collections: banners span full width (or 2-col), products in a grid */}
      {(() => {
        const banners: ShopifyCollection[] = [];
        const products: ShopifyCollection[] = [];

        collections.forEach((c) => {
          const { type } = getMedia(c);
          if (type === "banner") banners.push(c);
          else products.push(c);
        });

        return (
          <>
            {/* Wide banner cards — stacked full width */}
            {banners.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {banners.map((c) => {
                  const { url } = getMedia(c);
                  return (
                    <motion.div key={c.id} variants={cardVariants}>
                      <BannerCard collection={c} url={url} />
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Product-image cards — uniform grid */}
            {products.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((c) => {
                  const { url } = getMedia(c);
                  return (
                    <motion.div key={c.id} variants={cardVariants}>
                      <ProductCard collection={c} url={url} />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
    </motion.div>
  );
}
