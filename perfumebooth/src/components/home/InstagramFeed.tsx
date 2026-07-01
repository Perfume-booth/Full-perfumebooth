"use client";

import Image from "next/image";
import SectionHeader from "@/components/ui/SectionHeader";
import Carousel from "@/components/ui/Carousel";

import { INSTAGRAM_POSTS } from "@/lib/constants";

export default function InstagramFeed() {
  return (
    <section className="py-4 md:py-10 bg-[var(--color-bg)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">
        
        <SectionHeader 
          title="Follow Us On" 
          italicPart="Instagram" 
          viewAllLink="https://www.instagram.com/perfumeboothindia?igsh=ZXNydDBpcnM4Nnlz"
        />

        <div className="mt-8">
          <Carousel 
            containerClassName="gap-5"
            slideClassName="basis-[208px] md:basis-[256px]"
            options={{ align: "start", containScroll: "trimSnaps", dragFree: true }}
          >
            {INSTAGRAM_POSTS.map((post) => (
              <a
                key={post.id}
                href="https://www.instagram.com/perfumebooth"
                target="_blank"
                rel="noopener noreferrer"
                className="block relative aspect-[9/12] overflow-hidden group/post border border-[var(--color-border)] shadow-md hover:shadow-2xl transition-all duration-700"
              >
                {post.image && post.image !== "" && (
                  <Image 
                    src={post.image} 
                    alt={post.alt} 
                    fill 
                    className="object-cover transition-transform duration-1000 group-hover/post:scale-110" 
                    sizes="(max-width: 768px) 256px, 320px"
                  />
                )}

                <div className="absolute inset-0 bg-black/0 group-hover/post:bg-black/30 transition-colors duration-500 flex items-center justify-center">
                  <span className="opacity-0 group-hover/post:opacity-100 text-white text-[10px] uppercase font-bold tracking-widest translate-y-2 group-hover/post:translate-y-0 transition-all duration-500">
                    View on Instagram ↗
                  </span>
                </div>
              </a>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}0