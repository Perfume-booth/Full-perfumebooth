"use client";

import React from "react";
import BlogCard from "@/components/blog/BlogCard";
import SectionHeader from "@/components/ui/SectionHeader";
import Carousel from "@/components/ui/Carousel";
import type { Article } from "@/lib/shopify";

interface BlogSectionProps {
  articles: Article[];
}

export default function BlogSection({ articles = [] }: BlogSectionProps) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="py-4 md:py-10 bg-[var(--color-bg)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">
        
        <SectionHeader 
          title="Scent" 
          italicPart="Stories" 
          suffix="& Tips" 
          viewAllLink="/blog"
        />

        <div className="mt-8">
          <Carousel 
            containerClassName="gap-6"
            slideClassName="basis-[280px] md:basis-[calc(50%-12px)] lg:basis-[calc(25%-18px)]"
            options={{ align: "start", containScroll: "trimSnaps", dragFree: true }}
            showArrows={false}
          >
            {articles.map((article) => (
              <BlogCard 
                key={article.id} 
                article={article}  
                aspectRatio="video"
              />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
