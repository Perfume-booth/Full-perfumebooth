"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/lib/backend/types";

export interface BannerSlide {
  id: string | number;
  image: string;
  tag: string;
  title: string;
  description: string;
  ctaText: string;
  href: string;
}

export const DEFAULT_NEW_LAUNCH_BANNERS: BannerSlide[] = [
  {
    id: "caneza-launch",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/caneza-launch.png?v=1790754929",
    tag: "Canéza Paris • Official Launch",
    title: "Discover Your Next Signature Fragrance",
    description: "Crafted with rare essences and timeless French sophistication. Experience intense sillage and lasting notes.",
    ctaText: "Explore Canéza Collection",
    href: "/caneza",
  },
  {
    id: "anfar-launch",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/anfar-new.png?v=1790757234",
    tag: "Anfar ",
    title: "Collection",
    description: "Discover opulent oriental fragrances crafted with the finest amber, oud, and exotic spices. Long-lasting luxury for the discerning individual.",
    ctaText: "Explore Anfar",
    href: "/anfar",
  },
  {
    id: "marwa-extrait-launch",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/marwa_extrait_for_web_jpg.jpg?v=1790769258",
    tag: "Marwa Extrait ",
    title: "",
    description: "Discover the rich, intoxicating aroma of concentrated amber and oud, carefully aged to perfection. Experience long-lasting projection and a scent that evolves beautifully with your skin.",
    ctaText: "Explore Marwa Extrait",
    href: "/products/arabiyat-marwa-extrait-60ml",
  },
  {
    id: "mahd-al-dhabab-launch",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/MAHD_AL_DHAHAB_EXTRAIR_for_web.jpg_1.jpg?v=1790769759",
    tag: "Mahd Al Dahab ",
    title: "",
    description: "Discover the rich, intoxicating aroma of concentrated amber and oud, carefully aged to perfection. Experience long-lasting projection and a scent that evolves beautifully with your skin.",
    ctaText: "Mahd Al Dahab",
    href: "/new",
  },
];

interface NewLaunchesInteractiveProps {
  products: Product[];
  banners?: BannerSlide[];
}

export default function NewLaunchesInteractive({
  products,
  banners = DEFAULT_NEW_LAUNCH_BANNERS,
}: NewLaunchesInteractiveProps) {
  // ── 1. Banner Carousel State & Autoplay ──
  const [activeBanner, setActiveBanner] = useState(0);
  const [isBannerHovered, setIsBannerHovered] = useState(false);

  const nextBanner = useCallback(() => {
    setActiveBanner((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevBanner = useCallback(() => {
    setActiveBanner((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || isBannerHovered) return;
    const interval = setInterval(nextBanner, 6000); // 6s per banner
    return () => clearInterval(interval);
  }, [banners.length, isBannerHovered, nextBanner]);

  // ── 2. Product 5-Section Carousel State & Autoplay (5s per section) ──
  // Chunk products into groups of 4 (up to 5 sections / pages = 20 products)
  const productSections = useMemo(() => {
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += 4) {
      chunks.push(products.slice(i, i + 4));
    }
    return chunks.slice(0, 5); // Limit strictly to 5 sections as requested
  }, [products]);

  const totalSections = Math.max(1, productSections.length);
  const [activeSection, setActiveSection] = useState(0);
  const [isProductsHovered, setIsProductsHovered] = useState(false);

  const nextSection = useCallback(() => {
    setActiveSection((prev) => (prev + 1) % totalSections);
  }, [totalSections]);

  const prevSection = useCallback(() => {
    setActiveSection((prev) => (prev - 1 + totalSections) % totalSections);
  }, [totalSections]);

  // Auto-change product cards every 5 seconds
  useEffect(() => {
    if (totalSections <= 1 || isProductsHovered) return;
    const timer = setInterval(nextSection, 5000); // 5 seconds interval
    return () => clearInterval(timer);
  }, [totalSections, isProductsHovered, nextSection]);

  const currentProducts = productSections[activeSection] || [];
  const currentBanner = banners[activeBanner];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
      {/* ============================================================== */}
      {/* LEFT BIG CARD: BANNER CAROUSEL (Supports Adding More Banners)   */}
      {/* ============================================================== */}
      <motion.div 
        initial={{ opacity: 0, y: 35, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "0px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="lg:col-span-6 xl:col-span-6 flex flex-col will-change-transform"
        onMouseEnter={() => setIsBannerHovered(true)}
        onMouseLeave={() => setIsBannerHovered(false)}
      >
        <div className="relative w-full h-full min-h-[460px] sm:min-h-[520px] lg:min-h-[640px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-stone-200/50 flex flex-col justify-end p-6 sm:p-8 lg:p-10 group bg-stone-900">
          
          {/* Animated Banner Image Transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner.id}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={currentBanner.image}
                alt={currentBanner.title}
                fill
                priority={activeBanner === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={85}
                className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </motion.div>
          </AnimatePresence>

         

          {/* Top Floating Badge */}
          <div className="absolute top-5 left-5 sm:top-7 sm:left-7 z-20">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase bg-black/60 backdrop-blur-md text-amber-300 border border-amber-300/30 shadow-md">
              Featured Collection
            </span>
          </div>

          {/* Banner Content & Clickable Link */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative z-20 space-y-3 sm:space-y-4 max-w-lg"
            >


              <div className="pt-2 flex items-center gap-4">
                <Link
                  href={currentBanner.href}
                  className="inline-flex items-center gap-2 bg-[#fcf8f0] hover:bg-gold text-[#8c6721] font-bold text-xs sm:text-sm px-6 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-amber-900/40"
                >
                  {currentBanner.ctaText}
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

              </div>
            </motion.div>
          </AnimatePresence>

          {/* Banner Pagination Dots */}
          {banners.length > 1 && (
            <div className="absolute bottom-3 right-6 sm:bottom-4 sm:right-8 z-20 flex items-center gap-1.5">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveBanner(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === activeBanner 
                      ? "w-6 bg-amber-400" 
                      : "w-2 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to banner ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* RIGHT SIDE: 4 PRODUCT CARDS (SAME DESIGN ACROSS 5 SECTIONS)     */}
      {/* ============================================================== */}
      <motion.div 
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px" }}
        transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between will-change-transform"
        onMouseEnter={() => setIsProductsHovered(true)}
        onMouseLeave={() => setIsProductsHovered(false)}
      >

        {/* 2x2 Grid of 4 Product Cards (All Cards Have the Exact Same Design) */}
        <div className="relative min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 w-full h-full"
            >
              {currentProducts.map((product, idx) => {
                const rawPrice = product?.priceRange?.minVariantPrice?.amount;
                const rawCompareAt = product?.compareAtPriceRange?.minVariantPrice?.amount;

                const priceNum = rawPrice ? parseFloat(rawPrice) : 0;
                const compareAtNum = rawCompareAt ? parseFloat(rawCompareAt) : 0;

                const price = priceNum ? priceNum.toLocaleString("en-IN") : null;
                const compareAt = compareAtNum && compareAtNum > priceNum ? compareAtNum.toLocaleString("en-IN") : null;

                const discountPct = compareAtNum > priceNum && priceNum > 0
                  ? Math.round(((compareAtNum - priceNum) / compareAtNum) * 100)
                  : 0;

                const imageUrl = product.featuredImage?.url || "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/UomoBoldWHITEBG.jpg?v=1790591203";
                const brand = product.vendor || "Perfume Booth";

                return (
                  <motion.div
                    key={product.id || product.handle}
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "0px" }}
                    transition={{
                      duration: 0.75,
                      delay: 0.12 + idx * 0.08,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className="h-full flex flex-col will-change-transform"
                  >
                    <Link
                      href={`/products/${product.handle}`}
                      className="group relative h-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 flex flex-col justify-between overflow-hidden transition-all duration-500 bg-white border border-[#e7e1d5] hover:border-[#b8924a] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(184,146,74,0.14)] hover:-translate-y-1.5"
                      aria-label={`View ${product.title}`}
                    >
                      {/* Subtle Gold Shimmer Bar on Bottom on Hover */}
                      <div 
                        className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#b8924a] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                        aria-hidden="true" 
                      />

                      {/* Top: Luxury Badges & Editorial Title */}
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] uppercase tracking-[0.22em] font-semibold text-[#8c6721] bg-[#fcf8f0] border border-[#e8d7b7] px-2.5 py-0.5 rounded-full shadow-sm">
                           New
                          </span>

                          {discountPct > 0 ? (
                            <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full tracking-wide">
                              {discountPct}% OFF
                            </span>
                          ) : (
                            <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.2em] uppercase text-stone-400">
                              EAU DE PARFUM
                            </span>
                          )}
                        </div>

                        <h4 className="font-serif font-semibold text-xs sm:text-sm lg:text-[20px] text-stone-900 leading-snug line-clamp-2 mt-1 min-h-[38px] sm:min-h-[44px] group-hover:text-[#9b7635] transition-colors">
                          {product.title}
                        </h4>
                      </div>

                      {/* Center: Hero Bottle Image Seamlessly Merged into Card Background */}
                      <div className="relative w-full h-36 sm:h-44 md:h-50 my-2 flex items-center justify-center">
                        <Image
                          src={imageUrl}
                          alt={product.featuredImage?.altText || product.title}
                          fill
                          priority={activeSection === 0}
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 300px"
                          className="object-contain mix-blend-multiply p-1 sm:p-2 transition-all duration-700 ease-out group-hover:scale-110 group-hover:-translate-y-2"
                        />
                      </div>

                      {/* Bottom: Price Display & Classic Luxury Action Arrow */}
                      <div className="pt-2.5 sm:pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            {price && (
                              <span className="text-sm sm:text-base lg:text-[17px] font-bold text-stone-900 tracking-tight">
                                ₹{price}
                              </span>
                            )}
                            {compareAt && (
                              <span className="text-[11px] sm:text-xs line-through text-stone-400 font-normal">
                                ₹{compareAt}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Classic Luxury Action Button */}
                        <div 
                          className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900 text-amber-300 group-hover:bg-[#4a3622] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-105 border border-stone-800 group-hover:border-[#b8924a]"
                          aria-hidden="true"
                        >
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
