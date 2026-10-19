"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { TOP_CATEGORIES } from "@/lib/constants";

type Category = {
  label?: string;
  title?: string;
  image?: string | StaticImageData | { url: string };
  href?: string;
};

const luxuryEase = [0.16, 1, 0.3, 1] as const;

// 6 flower positions precisely placed along the mathematical semicircle arch:
// Desktop Arch equation: Center (600, 510), Radius R = 460
// Mobile Arch equation: Center (200, 210), Radius R = 175, ViewBox (400, 500)
const ARC_FLOWERS = [
  {
    num: 1,
    desktop: { left: "26.67%", top: "20.72%", rotate: -37.5 },
    mobile: { left: "23.37%", top: "14.23%", rotate: -37.5 },
  },
  {
    num: 2,
    desktop: { left: "35.33%", top: "12.15%", rotate: -22.5 },
    mobile: { left: "33.26%", top: "9.66%", rotate: -22.5 },
  },
  {
    num: 3,
    desktop: { left: "45.00%", top: "7.71%", rotate: -7.5 },
    mobile: { left: "44.29%", top: "7.32%", rotate: -7.5 },
  },
  {
    num: 4,
    desktop: { left: "55.00%", top: "7.71%", rotate: 7.5 },
    mobile: { left: "55.71%", top: "7.32%", rotate: 7.5 },
  },
  {
    num: 5,
    desktop: { left: "64.67%", top: "12.15%", rotate: 22.5 },
    mobile: { left: "66.74%", top: "9.66%", rotate: 22.5 },
  },
  {
    num: 6,
    desktop: { left: "73.34%", top: "20.72%", rotate: 37.5 },
    mobile: { left: "76.63%", top: "14.23%", rotate: 37.5 },
  },
];

export default function TopCategories({ data }: { data?: Category[] }) {
  const items = data || TOP_CATEGORIES;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section
      className="relative overflow-hidden bg-[#faf7f2] pt-6 sm:pt-10 md:pt-20 pb-0 select-none border-t border-b border-[#ede8df]"
      aria-labelledby="category-heading"
    >
      {/* Top Left Corner Architectural Flourish */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.15, ease: luxuryEase }}
        className="pointer-events-none absolute top-0 left-0 bottom-0 w-16 sm:w-28 md:w-36 lg:w-44 z-0 overflow-hidden"
      >
        <div className="absolute top-0 left-3 sm:left-6 md:left-8 bottom-0 w-10 sm:w-14 md:w-18 opacity-25 sm:opacity-30">
          <Image
            src="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/collection-flourish-crisp.webp?v=1791004037"
            alt=""
            fill
            className="object-fill brightness-75 sepia"
          />
        </div>
      </motion.div>

      {/* Top Right Corner Architectural Flourish (mirrored) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.15, ease: luxuryEase }}
        className="pointer-events-none absolute top-0 right-0 bottom-0 w-16 sm:w-28 md:w-36 lg:w-44 z-0 overflow-hidden"
      >
        <div className="absolute top-0 right-3 sm:right-6 md:right-8 bottom-0 w-10 sm:w-14 md:w-18 opacity-25 sm:opacity-30 scale-x-[-1]">
          <Image
            src="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/collection-flourish-crisp.webp?v=1791004037"
            alt=""
            fill
            className="object-fill brightness-75 sepia"
          />
        </div>
      </motion.div>

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 z-10">
        {/* Section Header: Original clean text with Maison luxury tracking */}
        <div className="text-center mb-3 sm:mb-4 md:mb-8">
          <p
            id="category-heading"
            className="text-[11px] sm:text-xs md:text-sm font-medium tracking-[0.38em] text-[#8c7456] uppercase"
          >
            Shop By Category
          </p>
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.1, ease: luxuryEase }}
            className="mx-auto mt-1.5 md:mt-2 h-px w-10 bg-[#b8924a]/50 origin-center"
          />
        </div>

        {/* Architectural Portal Arch: Perfect Semicircle on Top + Straight Vertical Legs on Sides touching bottom border */}
        <div className="relative mx-auto w-full max-w-[1200px] pb-6 sm:pb-10 md:pb-18">
          {/* SVG Arch: Vertical straight sides dropping to bottom + perfect circular arc on top */}
          <div className="pointer-events-none absolute inset-0 z-0">
            {/* Desktop Semicircle Arch */}
            <svg
              viewBox="0 0 1200 700"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="hidden md:block w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Left Wing: Straight vertical line from bottom up, curving into perfect semicircle ending right at flower 1 */}
              <motion.path
                d="M 140 700 L 140 510 A 460 460 0 0 1 310.5 152.5"
                stroke="#d6c6b2"
                strokeWidth="1.2"
                strokeOpacity="0.55"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.85, delay: 0.15, ease: luxuryEase }}
              />
              {/* Right Wing: Curves starting from bottom up to flower 6 */}
              <motion.path
                d="M 1060 700 L 1060 510 A 460 460 0 0 0 889.5 152.5"
                stroke="#d6c6b2"
                strokeWidth="1.2"
                strokeOpacity="0.55"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.85, delay: 0.15, ease: luxuryEase }}
              />
            </svg>

            {/* Mobile Semicircle Arch */}
            <svg
              viewBox="0 0 400 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="block md:hidden w-full h-full"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M 25 500 L 25 210 A 175 175 0 0 1 93.5 71.2"
                stroke="#d6c6b2"
                strokeWidth="1.2"
                strokeOpacity="0.5"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.15, ease: luxuryEase }}
              />
              <motion.path
                d="M 375 500 L 375 210 A 175 175 0 0 0 306.5 71.2"
                stroke="#d6c6b2"
                strokeWidth="1.2"
                strokeOpacity="0.5"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.15, ease: luxuryEase }}
              />
            </svg>
          </div>

          {/* 6 Numbered Flowers along the Semicircle Arch Crest (open gap between flowers 1 and 6) */}
          <div className="pointer-events-none absolute inset-0 z-20">
            {ARC_FLOWERS.map((step, idx) => {
              const cat = items[idx];
              const isHighlighted = hoveredIndex === idx;
              const distFromEnd = Math.min(idx, 5 - idx);
              const flowerDelay = 0.42 + distFromEnd * 0.1;

              return (
                <div key={step.num}>
                  {/* Desktop Step: resting directly on the semicircle curve */}
                  <div
                    style={{
                      left: step.desktop.left,
                      top: step.desktop.top,
                      transform: `translate(-50%, -50%) rotate(${step.desktop.rotate}deg)`,
                    }}
                    className="hidden md:block absolute pointer-events-auto"
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.55, delay: flowerDelay, ease: luxuryEase }}
                    >
                      <Link
                        href={cat?.href || "/all"}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="group relative flex flex-col items-center justify-center p-1 focus:outline-none cursor-pointer"
                        aria-label={`View ${cat?.label || `Category ${step.num}`}`}
                      >
                        <div
                          className={`relative mt-0.5 w-7 h-5 lg:w-8 lg:h-5.5 transition-all duration-300 ${
                            isHighlighted
                              ? "opacity-100 scale-115 drop-shadow-[0_2px_8px_rgba(184,146,74,0.45)]"
                              : "opacity-45 group-hover:opacity-95 group-hover:scale-105"
                          }`}
                        >
                          <Image
                            src="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/flower-emblem.png?v=1791004038"
                            alt=""
                            fill
                            className="object-contain"
                          />
                        </div>
                        {cat?.label && (
                          <span
                            style={{ transform: `rotate(${-step.desktop.rotate}deg)` }}
                            className={`absolute -bottom-5 whitespace-nowrap text-[9px] uppercase tracking-widest font-medium transition-all duration-300 ${
                              isHighlighted
                                ? "text-[#4a3622] opacity-100 font-semibold"
                                : "opacity-0 group-hover:opacity-80 text-[#8c7456]"
                            }`}
                          >
                            {cat.label}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  </div>

                  {/* Mobile Step */}
                  <div
                    style={{
                      left: step.mobile.left,
                      top: step.mobile.top,
                      transform: `translate(-50%, -50%) rotate(${step.mobile.rotate}deg)`,
                    }}
                    className="block md:hidden absolute pointer-events-auto"
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: flowerDelay, ease: luxuryEase }}
                    >
                      <Link
                        href={cat?.href || "/all"}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="group relative flex flex-col items-center justify-center p-1 focus:outline-none cursor-pointer"
                        aria-label={`View ${cat?.label || `Category ${step.num}`}`}
                      >
                        <span
                          className={`text-[10px] sm:text-[11px] font-serif italic transition-all duration-300 ${
                            isHighlighted ? "text-[#4a3622] font-bold" : "text-[#a89886]"
                          }`}
                        >
                          {step.num}
                        </span>
                        <div
                          className={`relative mt-0.5 w-5 h-3.5 sm:w-6 sm:h-4 transition-all duration-300 ${
                            isHighlighted ? "opacity-100 scale-110 drop-shadow-sm" : "opacity-45"
                          }`}
                        >
                          <Image
                            src="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/flower-emblem.png?v=1791004038"
                            alt=""
                            fill
                            className="object-contain"
                          />
                        </div>
                      </Link>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Category Cards: All 6 Categories Arranged with Perfection in 3 Columns */}
          <div className="relative z-10 mx-auto max-w-[440px] sm:max-w-[580px] md:max-w-[700px] lg:max-w-[780px] grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 lg:gap-10 pt-14 sm:pt-24 md:pt-40 px-3 sm:px-6">
            {items.slice(0, 6).map((cat, idx) => {
              const image =
                typeof cat.image === "object" && "url" in cat.image
                  ? cat.image.url
                  : (cat.image as string) || "";
              const label = cat.label || cat.title || "Category";
              const href = cat.href || "/all";
              const isHovered = hoveredIndex === idx;

              return (
                <motion.div
                  key={href || idx}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.75,
                    delay: 0.52 + idx * 0.07,
                    ease: luxuryEase,
                  }}
                  className="w-full flex justify-center"
                >
                  <Link
                    href={href}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`group relative flex flex-col items-center p-2 sm:p-3 transition-transform duration-500 cursor-pointer w-full ${
                      isHovered ? "-translate-y-1.5" : "hover:-translate-y-1.5"
                    }`}
                    aria-label={`Shop ${label}`}
                  >
                    {/* Bottle Product Image */}
                    <div className="relative w-18 h-18 sm:w-22 sm:h-22 md:w-28 md:h-28 lg:w-32 lg:h-32 my-2 overflow-hidden">
                      {image && (
                        <Image
                          src={image}
                          alt={label}
                          fill
                          className="object-contain p-1 transition-transform duration-500 group-hover:scale-110 drop-shadow-md"
                          sizes="(max-width: 640px) 100px, (max-width: 1024px) 130px, 160px"
                        />
                      )}
                    </div>

                    {/* Category Label (original text only) */}
                    <div className="text-center mt-auto w-full">
                      <span className="block truncate text-[9px] min-[380px]:text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-[0.1em] sm:tracking-[0.16em] text-[#3b2e22] transition-colors duration-300 group-hover:text-[#8c7456]">
                        {label}
                      </span>
                      {/* Hover Gold Accent Line */}
                      <span className="mx-auto mt-1.5 block h-px w-0 bg-[#b8924a] transition-all duration-300 group-hover:w-3/4" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
