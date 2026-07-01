"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState, useEffect, MouseEvent } from "react";
import SectionHeader from "@/components/ui/SectionHeader";

/* ─── Gender Data ─── */
const GENDER_CARDS = [
  {
    id: "men",
    tagline: "Bold. Powerful. Magnetic.",
    description: "Commanding fragrances crafted for the modern gentleman — woody, spicy, and intensely captivating.",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-MEN-1_jpg.jpg?v=1781067065",
    mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-MEN-mobile.jpg_1.jpg?v=1782809007",
    href: "/men",
    accent: "#b8924a",
    glow: "rgba(184,146,74,0.3)",
    gradientFrom: "rgba(10,8,30,0.85)",
    gradientMid: "rgba(26,15,46,0.5)",
    pill: "#1A0F2E",
    pillText: "#b8924a",
  },
  {
    id: "women",
    tagline: "Graceful. Radiant. Enchanting.",
    description: "Timeless florals and delicate musk that speak the language of elegance and femininity.",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-WOMEN-1_jpg.jpg?v=1781067065",
    mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-WOMEN-mobile.jpg_1.jpg?v=1782809007",
    href: "/women",
    accent: "#e8a0b8",
    glow: "rgba(232,160,184,0.3)",
    gradientFrom: "rgba(30,10,20,0.85)",
    gradientMid: "rgba(60,20,40,0.5)",
    pill: "#3b0f22",
    pillText: "#f0b8d0",
  },
  {
    id: "unisex",
    tagline: "Boundless. Free. Singular.",
    description: "Transcendent scents that break conventions — crafted for those who wear their own rules.",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-UNISEX-1_jpg.jpg?v=1781067065",
    mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-UNISEX-mobile.jpg_1.jpg?v=1782809006",
    href: "/unisex",
    accent: "#8bbfd8",
    glow: "rgba(139,191,216,0.3)",
    gradientFrom: "rgba(5,15,30,0.85)",
    gradientMid: "rgba(10,30,50,0.5)",
    pill: "#0a1e30",
    pillText: "#8bbfd8",
  },
];

/* ─── Tilt Card Component ─── */
function GenderCard({
  card,
  index,
}: {
  card: (typeof GENDER_CARDS)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.75, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group cursor-pointer"
    >
      <Link href={card.href} className="block">
        {/* ── Outer glow halo ── */}
        <motion.div
          animate={{
            opacity: hovered ? 1 : 0,
            scale: hovered ? 1.05 : 0.9,
          }}
          transition={{ duration: 0.5 }}
          className="absolute -inset-2  blur-2xl -z-10 pointer-events-none"
          style={{ background: card.glow }}
        />

        {/* ── Card Shell ── */}
        <div
          className="relative overflow-hidden transition-all duration-700"
          style={{
            boxShadow: hovered
              ? `0 32px 64px -12px ${card.glow}, 0 0 0 1px ${card.accent}22`
              : "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          {/* ── Image ── */}
          <div className="relative  overflow-hidden">
            <div className="relative aspect-[3/5] md:aspect-square overflow-hidden">
              <Image
                 src={isMobile ? card.mobileImage : card.image}
                alt={card.id}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 90vw, (max-width: 1200px) 33vw, 400px"
              />
            </div>

            {/* ── Gradient overlay ── */}

            {/* ── Shimmer diagonal sweep on hover ── */}
            <motion.div
              initial={{ x: "-120%", skewX: "-20deg" }}
              animate={{ x: hovered ? "220%" : "-120%" }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute inset-y-0 w-1/3 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 50%, transparent)",
              }}
            />


            {/* ── Content block at bottom ── */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-3 md:p-7 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              {/* Tagline */}
              <motion.p
                animate={{
                  opacity: hovered ? 1 : 0,
                  y: hovered ? 0 : 5,
                }}
                transition={{ duration: 0.4, delay: 0.06 }}
                className="text-white text-[6px] md:text-[9px] uppercase tracking-[0.2em] md:tracking-[0.4em] font-bold mb-1 md:mb-2 hidden sm:block"
              >
                {card.tagline}
              </motion.p>

              {/* CTA row */}
              <div className="flex items-center gap-1.5 md:gap-3">
                <motion.span
                  animate={{ width: hovered ? 24 : 12 }}
                  transition={{ duration: 0.4 }}
                  className="h-px block md:w-4 w-2"
                  style={{ background: card.accent }}
                />
                <span className="text-[7px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.3em] text-white/80 font-medium">
                  Explore <span className="hidden sm:inline">Collection</span>
                </span>
                <motion.svg
                  animate={{ x: hovered ? 4 : 0, opacity: hovered ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-2 h-2 md:w-3.5 md:h-3.5 hidden sm:block"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 7H12M8 3L12 7L8 11"
                    stroke={card.accent}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Section ─── */
export default function GenderSection() {
  return (
    <section className="relative py-6 md:py-10 overflow-hidden">
      {/* Background ambient decoration */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        {/* Soft gold glow top-left */}
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #b8924a, transparent)" }}
        />
        {/* Rose glow bottom-right */}
        <div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #e8a0b8, transparent)" }}
        />
        {/* Blue glow center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full blur-3xl opacity-[0.04]"
          style={{ background: "radial-gradient(ellipse, #8bbfd8, transparent)" }}
        />
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">
        {/* Header */}
        <SectionHeader
          title="Shop By"
          italicPart="Gender"
        />

        {/* Cards grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:gap-5 gap-2 ">
          {GENDER_CARDS.map((card, index) => (
            <GenderCard key={card.id} card={card} index={index} />
          ))}
        </div>

        {/* Bottom label row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 md:mt-14 flex items-center justify-center gap-6 text-[var(--color-text-muted)] text-[10px] uppercase tracking-[0.3em]"
        >

        </motion.div>
      </div>
    </section>
  );
}
