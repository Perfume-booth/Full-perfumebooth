"use client";

import { TOP_CATEGORIES } from "@/lib/constants";
import { motion } from "framer-motion";
import { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import Image from "next/image";
import Carousel from "../ui/Carousel";

type Category = {
  label?: string;
  title?: string;
  description?: string;
  image?: any; // Keep 'any' for now since image format may vary (URL or object)
  handle?: string;
  href?: string;
};

/* ─── Accent colors per category index ─── */
const CATEGORY_ACCENTS = [
  { accent: "#b8924a", glow: "rgba(184,146,74,0.25)", textColor: "#a07830" },  // gold - Perfumes
  { accent: "#8b6344", glow: "rgba(139,99,68,0.22)", textColor: "#6b4420" },   // brown - Attars
  { accent: "#5ab3d8", glow: "rgba(90,179,216,0.22)", textColor: "#2980a0" },  // blue - Deos
  { accent: "#e85d7a", glow: "rgba(232,93,122,0.22)", textColor: "#c0365a" },  // rose - Gift Sets
  { accent: "#7b6fca", glow: "rgba(123,111,202,0.22)", textColor: "#5a4eaa" }, // purple - Scent Shots
  { accent: "#5aad8a", glow: "rgba(90,173,138,0.22)", textColor: "#357a60" },  // green - Body Mists
];

function CategoryCard({ cat, index }: { cat: Category; index: number }) {
  const [hovered, setHovered] = useState(false);
  const colors = CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length];

  const href = cat?.href || "#";
  const label = cat?.label || cat?.title || "Category";
  const image = cat?.image?.url || cat?.image;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex justify-center items-center h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <a href={href} className="block w-full max-w-[224px]">

        <motion.div
          className="absolute inset-0 rounded-full blur-2xl -z-10 pointer-events-none"
          animate={{
            background: hovered
              ? colors.glow
              : "transparent",
          }}
          transition={{ duration: 0.4 }}
        />

        {/* ── Circle Image ── */}
        <div className="relative mx-auto aspect-square w-full overflow-hidden transition-all duration-500">
          <Image
            src={image}
            alt={label}
            fill
            priority
            className="w-full h-full object-contain p-4 md:p-6 transition-transform duration-700"
            style={{ transform: hovered ? 'scale(1.1)' : 'scale(1)' }}
            sizes="(max-width: 640px) 110px, (max-width: 768px) 140px, 224px"
          />

          {/* Shine overlay on hover */}
          <div
            className="absolute inset-0 rounded-full transition-opacity duration-500 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${colors.glow} 0%, transparent 60%)`,
                
            }}
          />
        </div>

        {/* ── Label ── */}
        <div className="text-center mt-3 md:mt-2">
          <span
            className="block text-[10px] md:text-xs font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase transition-colors duration-300 line-clamp-1"
            style={{ color: hovered ? colors.textColor : "var(--color-text-primary)" }}
          >
            {label}
          </span>
          {/* Animated underline */}
          <div
            className="h-px mx-auto mt-1 md:mt-1.5 transition-all duration-500 origin-center"
            style={{
              width: hovered ? "80%" : "0%",
              background: `linear-gradient(to right, transparent, ${colors.accent}, transparent)`,
            }}
          />
        </div>
      </a>
    </motion.div>
  );
}

export default function TopCategories({
  data,
}: {
  data?: Category[];
}) {
  const items = data || TOP_CATEGORIES;

  return (
    <section className="py-4 md:py-10 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">

        {/* ── Header ── */}
        <SectionHeader
          title="Shop By"
          italicPart="Category"
          viewAllLink="/all"
        />

        {/* Cards - Unified Carousel */}
        <div className="mt-8">
          <Carousel 
            containerClassName="gap-4 md:gap-3"
            slideClassName="basis-[110px] sm:basis-[140px] md:basis-[224px]"
            options={{ align: "start", containScroll: "trimSnaps", dragFree: true }}
            showArrows={false}
          >
            {items.map((cat, i) => {
              if (!cat) return null;
              return <CategoryCard key={i} cat={cat} index={i} />;
            })}
          </Carousel>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}