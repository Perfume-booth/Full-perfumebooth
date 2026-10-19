"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import Carousel from "@/components/ui/Carousel";
import React, { useRef } from "react";

const VIDEO_CAROUSEL_DATA = [
  {
    label: "Al Haramain",
    video: "https://cdn.shopify.com/videos/c/o/v/801c3f868981473ebdda06f0124b3e24.mp4",
    href: "/al-haramain",
  },
 
  {
    label: "Arabiyat Prestige",
    video: "https://cdn.shopify.com/videos/c/o/v/bf6cee54d3a54c02bacfae2f78062c59.mp4",
    href: "/arabiyat-prestige",
  },
  {
    label: "Al Haramain",
    video: "https://cdn.shopify.com/videos/c/o/v/68e9382119d848c9a6324a3d5c6f45ce.mp4",
    href: "/al-haramain",
  },
  
 
  {
    label: "Arabiyat Prestige",
    video: "https://cdn.shopify.com/videos/c/o/v/9c0ff88aa047479588b8972589ab061b.mp4",
    href: "/products/arabiyat-prestige-bahiya-garnet-edp-100ml-unisex",
  },
 
  {
    label: "Lomani",
    video: "https://cdn.shopify.com/videos/c/o/v/f3503e6be44e427cb6966f4e31fa2b2e.mp4",
    href: "/lomani",
  },
 
  {
    label: "Arabiyat Prestige",
    video: "https://cdn.shopify.com/videos/c/o/v/3e8d7db2fa484d6c9c659c78cdabb230.mp4",
    href: "/arabiyat-prestige",
  },
  {
    label: "Al-Haramain",
    video: "https://cdn.shopify.com/videos/c/o/v/490d9ea75336470f8bddb06d558076d6.mp4",
    href: "/al-haramain",
  },
  {
    label: "MPF",
    video: "https://cdn.shopify.com/videos/c/o/v/28aee50ee417466ea254e2683ba9123a.mp4",
    href: "/mpf",
  },
];

export default function VideoSection({
  items,
  title = "The",
  italicPart = "Cinematic",
  suffix = "Experience"
}: {
  items?: any[];
  title?: string;
  italicPart?: string;
  suffix?: string;
} = {}) {
  const displayItems = items && items.length > 0 ? items : VIDEO_CAROUSEL_DATA;
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "200px 0px" });

  return (
    <section ref={sectionRef} className="py-4 md:py-10 bg-[var(--color-bg)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">

        <SectionHeader
          title={title}
          italicPart={italicPart} 
          suffix={suffix} 
        />

        <div className="mt-8">
          <Carousel 
            containerClassName="gap-5.5 md:gap-6"
            slideClassName="basis-[75vw] md:basis-[350px]"
            options={{ align: "center", loop: true }}
            autoplay={true}
            autoplayDelay={5000}
            showDots={true}
          >
            {displayItems.map((item: any, index: number) => (
              <VideoCard 
                key={`${item.label}-${index}`} 
                item={item} 
                index={index} 
                sectionInView={isInView}
              />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}

interface VideoItem {
  label: string;
  video: string;
  href: string;
}

function VideoCard({ item, index, sectionInView }: { item: VideoItem; index: number; sectionInView: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    if (window.innerWidth >= 768 && videoRef.current) {
      videoRef.current.play().catch((err) => console.log("Video play failed:", err));
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 768 && videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
      className="group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={item.href} className="block relative">
        <div className="relative aspect-[9/16] md:aspect-[2/3] overflow-hidden bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-lg group-hover:shadow-2xl transition-all duration-700">
          <video
            ref={videoRef}
            loop
            muted
            playsInline
            preload="none"
            aria-label={`${item.label} fragrance video`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          >
            {sectionInView && (
              <source src={item.video} type={item.video.endsWith(".mp4") ? "video/mp4" : undefined} />
            )}
          </video>

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

          <div className="absolute inset-x-8 bottom-10 z-10">

            <h3 className="text-2xl md:text-3xl font-serif text-white mb-6 group-hover:translate-x-2 transition-transform duration-500">
              {item.label}
            </h3>

            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
              <span className="w-12 h-px bg-[var(--color-gold)]" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-white">
                Experience Now
              </span>
            </div>
          </div>
        </div>

        <div className="absolute -inset-4 bg-[var(--color-gold)]/5 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      </Link>
    </motion.div>
  );
}
