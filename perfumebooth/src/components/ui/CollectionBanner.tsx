"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { BRAND_MEDIA } from "@/lib/constants";

interface CollectionBannerProps {
  title?: string;
  collectionHandle?: string;
  bannerImage?: string;
  bannerImages?: string[];
  bannerVideo?: string;
  backendBannerImage?: string | null;
  cmsBannerImages?: string[];
}

export default function CollectionBanner({
  title,
  collectionHandle,
  bannerImage,
  bannerImages,
  bannerVideo,
  backendBannerImage,
  cmsBannerImages = [],
}: CollectionBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = useMemo(() => {
    // 1. Prioritize new CMS Page Banners if available
    if (cmsBannerImages && cmsBannerImages.length > 0) return cmsBannerImages;

    // 2. Fallback to Shopify Backend collection image if available
    if (backendBannerImage) return [backendBannerImage];

    // 3. Fall back to custom overrides / slideshows
    if (bannerImages && bannerImages.length > 0) return bannerImages;
    if (bannerImage) return [bannerImage];

    // 4. Fall back to local preset banners
    if (collectionHandle) {
      const media = BRAND_MEDIA[collectionHandle] || BRAND_MEDIA["default"];
      if (media && media.type === "image") {
        return [media.desktopSrc];
      }
    }

    return [];
  }, [cmsBannerImages, backendBannerImage, bannerImages, bannerImage, collectionHandle]);

  const activeVideo = useMemo(() => {
    if (bannerVideo) return bannerVideo;
    if (collectionHandle) {
      const media = BRAND_MEDIA[collectionHandle];
      if (media && media.type === "video") {
        return media.desktopSrc;
      }
    }
    return null;
  }, [bannerVideo, collectionHandle]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative w-full aspect-[34/9] md:aspect-[20/5] overflow-hidden rounded-lg md:rounded-xl mb-8 bg-[#1a1a1a] mt-4">
      <div className="absolute inset-0">
        {activeVideo ? (
          <div className="w-full h-full relative bg-[#121212] overflow-hidden">
            {/* Blurred Background Video to fill space */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-105"
              src={activeVideo}
            />
            {/* Main Video centered and fully visible */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="relative z-10 w-full h-full object-contain mx-auto"
              src={activeVideo}
            />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {slides.length > 0 && slides[currentSlide] ? (
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute inset-0 z-0"
              >
                {slides[currentSlide]?.match(/\.(mp4|webm|mov)$/i) ? (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="object-cover w-full h-full"
                    src={slides[currentSlide]}
                  />
                ) : (
                  <Image
                    src={slides[currentSlide]}
                    alt={title || "Collection banner"}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 1200px"
                  />
                )}
              </motion.div>
            ) : bannerImage && bannerImage !== "" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-0"
              >
                {bannerImage?.match(/\.(mp4|webm|mov)$/i) ? (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="object-cover w-full h-full"
                    src={bannerImage}
                  />
                ) : (
                  <Image
                    src={bannerImage}
                    alt={title || "Collection banner"}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 1200px"
                  />
                )}
              </motion.div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] z-0" />
            )}
          </AnimatePresence>
        )}
        {/* Pagination Dots */}
        {slides.length > 1 && !activeVideo && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSlide(i)}
                className="group relative flex items-center justify-center p-1"
                aria-label={`Go to slide ${i + 1}`}
                suppressHydrationWarning
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    i === currentSlide
                      ? "w-6 h-1.5 bg-[var(--color-gold)]"
                      : "w-1.5 h-1.5 bg-white/40 group-hover:bg-white/60"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
