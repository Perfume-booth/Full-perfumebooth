"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedArrowRight } from "@/components/ui/icons/AnimatedArrowRight";
import type { Article } from "@/lib/shopify";
import { cn } from "@/lib/utils";

interface BlogCardProps {
  article: Article;
  className?: string;
  aspectRatio?: "video" | "square" | "portrait" | "wide";
}

export default function BlogCard({ 
  article, 
  className,
  aspectRatio = "wide" 
}: BlogCardProps) {
  const date = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[4/5]",
    wide: "aspect-[16/9]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={cn(
        "group h-full bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 hover:-translate-y-2",
        className
      )}
    >
      <Link href={`/blog/${article.handle}`} className="block h-full flex flex-col">
        {/* Image Wrapper */}
        <div className={cn("relative overflow-hidden bg-gradient-to-br from-[#f4ede4] to-[#e8cbb0]", aspectClasses[aspectRatio])}>
          <Image
            src={article.image?.url || "https://images.unsplash.com/photo-1638342863994-ae4eee256688?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"}
            alt={article.image?.altText || article.title}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Overlay gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>

        {/* Content */}
        <div className="p-4 md:p-5 flex flex-col flex-grow">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-[0.2em] text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-2 py-0.5 rounded-full">
              {date}
            </span>
            {article.authorV2 && (
              <span className="text-[8px] md:text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-muted)] font-medium">
                {article.authorV2.name}
              </span>
            )}
          </div>

          <h3 className="font-serif text-base md:text-lg text-[var(--color-text-primary)] mb-2 leading-snug group-hover:text-[var(--color-gold)] transition-colors duration-300 line-clamp-2 min-h-[2.8em]">
            {article.title}
          </h3>

          <div
            className="text-[11px] md:text-xs text-[var(--color-text-muted)] mb-4 line-clamp-2 leading-relaxed font-light flex-grow"
            dangerouslySetInnerHTML={{ __html: article.excerpt || "" }}
          />

          <div className="mt-auto pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[var(--color-text-primary)] group-hover:text-[var(--color-gold)] transition-colors">
              Read Story
            </span>
            <div className="w-6 h-6 rounded-full bg-[var(--color-bg-subtle)] group-hover:bg-[var(--color-gold)] flex items-center justify-center transition-all duration-300 group-hover:translate-x-1">
              <AnimatedArrowRight size={10} className="text-[var(--color-text-primary)] group-hover:text-white transition-colors" animateOn="hover" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
