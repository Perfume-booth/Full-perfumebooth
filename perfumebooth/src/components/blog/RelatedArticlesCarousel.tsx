"use client";

import { useState } from "react";
import { AnimatedArrowLeft as ArrowLeft } from "@/components/ui/icons/AnimatedArrowLeft";
import { AnimatedArrowRight as ArrowRight } from "@/components/ui/icons/AnimatedArrowRight";
import type { Article } from "@/lib/shopify";
import BlogCard from "@/components/blog/BlogCard";

export default function RelatedArticlesCarousel({ articles }: { articles: Article[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;
  
  const totalPages = Math.ceil(articles.length / itemsPerPage);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  if (articles.length === 0) return null;

  const currentArticles = articles.slice(
    currentIndex * itemsPerPage,
    currentIndex * itemsPerPage + itemsPerPage
  );

  return (
    <section className="bg-[var(--color-surface)] border-t border-[var(--color-border)] py-14 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Heading & Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
          <div className="md:w-24"></div> {/* Spacer for centering */}
          
          <div className="text-center flex-1">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-gold)] mb-2">Continue Reading</p>
            <h3
              className="text-2xl font-semibold text-[var(--color-text-primary)]"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Related Articles
            </h3>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="h-px w-12 bg-[var(--color-border)]" />
              <div className="w-1 h-1 rounded-full bg-[var(--color-gold)]" />
              <div className="h-px w-12 bg-[var(--color-border)]" />
            </div>
          </div>

          <div className="md:w-24 flex justify-end gap-2">
            {articles.length > itemsPerPage && (
              <>
                <button 
                  onClick={prev}
                  className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-all"
                  aria-label="Previous"
                >
                  <ArrowLeft size={16} animateOn="hover" />
                </button>
                <button 
                  onClick={next}
                  className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-all"
                  aria-label="Next"
                >
                  <ArrowRight size={16} animateOn="hover" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
          {currentArticles.map((article) => (
            <BlogCard 
              key={article.id} 
              article={article} 
              aspectRatio="video"
              className="animate-in fade-in duration-500"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
