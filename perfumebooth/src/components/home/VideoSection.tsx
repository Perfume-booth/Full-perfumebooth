"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import SectionHeader from "@/components/ui/SectionHeader";
import Carousel from "@/components/ui/Carousel";
import React, { useRef, useState, useEffect } from "react";
import { Play } from "lucide-react";

export interface VideoItem {
  id?: string;
  label: string;
  video: string;
  poster?: string;
  href: string;
}

const DEFAULT_POSTERS = [
  "/videos/posters/clip-1.jpg",
  "/videos/posters/clip-2.jpg",
  "/videos/posters/clip-3.jpg",
  "/videos/posters/clip-4.jpg",
  "/videos/posters/clip-5.jpg",
  "/videos/posters/clip-6.jpg",
  "/videos/posters/clip-7.jpg",
  "/videos/posters/clip-8.jpg",
];

const VIDEO_CAROUSEL_DATA: VideoItem[] = [
  {
    label: "Al Haramain",
    video: "https://cdn.shopify.com/videos/c/o/v/801c3f868981473ebdda06f0124b3e24.mp4",
    poster: "/videos/posters/clip-1.jpg",
    href: "/al-haramain",
  },
  {
    label: "Arabiyat Prestige",
    video: "https://cdn.shopify.com/videos/c/o/v/bf6cee54d3a54c02bacfae2f78062c59.mp4",
    poster: "/videos/posters/clip-2.jpg",
    href: "/arabiyat-prestige",
  },
  {
    label: "Al Haramain",
    video: "https://cdn.shopify.com/videos/c/o/v/68e9382119d848c9a6324a3d5c6f45ce.mp4",
    poster: "/videos/posters/clip-3.jpg",
    href: "/al-haramain",
  },
  {
    label: "Arabiyat Prestige",
    video: "https://cdn.shopify.com/videos/c/o/v/9c0ff88aa047479588b8972589ab061b.mp4",
    poster: "/videos/posters/clip-4.jpg",
    href: "/products/arabiyat-prestige-bahiya-garnet-edp-100ml-unisex",
  },
  {
    label: "Lomani",
    video: "https://cdn.shopify.com/videos/c/o/v/f3503e6be44e427cb6966f4e31fa2b2e.mp4",
    poster: "/videos/posters/clip-5.jpg",
    href: "/lomani",
  },
  {
    label: "Arabiyat Prestige",
    video: "https://cdn.shopify.com/videos/c/o/v/3e8d7db2fa484d6c9c659c78cdabb230.mp4",
    poster: "/videos/posters/clip-6.jpg",
    href: "/arabiyat-prestige",
  },
  {
    label: "Al-Haramain",
    video: "https://cdn.shopify.com/videos/c/o/v/490d9ea75336470f8bddb06d558076d6.mp4",
    poster: "/videos/posters/clip-7.jpg",
    href: "/al-haramain",
  },
  {
    label: "MPF",
    video: "https://cdn.shopify.com/videos/c/o/v/28aee50ee417466ea254e2683ba9123a.mp4",
    poster: "/videos/posters/clip-8.jpg",
    href: "/mpf",
  },
];

export default function VideoSection({
  items,
  title = "The",
  italicPart = "Cinematic",
  suffix = "Experience"
}: {
  items?: VideoItem[];
  title?: string;
  italicPart?: string;
  suffix?: string;
} = {}) {
  const displayItems = items && items.length > 0 ? items : VIDEO_CAROUSEL_DATA;
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "200px 0px" });
  const [activeSlide, setActiveSlide] = useState(0);

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
            onSelect={setActiveSlide}
          >
            {displayItems.map((item: VideoItem, index: number) => (
              <VideoCard 
                key={`${item.label}-${index}`} 
                item={item} 
                index={index} 
                sectionInView={isInView}
                isActive={activeSlide === index}
              />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}

function VideoCard({
  item,
  index,
  sectionInView,
  isActive
}: {
  item: VideoItem;
  index: number;
  sectionInView: boolean;
  isActive: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const posterSrc = item.poster || DEFAULT_POSTERS[index % DEFAULT_POSTERS.length];

  // Desktop hover playback
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (typeof window !== "undefined" && window.innerWidth >= 768 && videoRef.current) {
      setIsBuffering(true);
      videoRef.current.play().catch(() => setIsBuffering(false));
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsBuffering(false);
    if (typeof window !== "undefined" && window.innerWidth >= 768 && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Mobile / Touch active slide auto-play
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    if (!sectionInView || !videoRef.current) return;

    if (isActive) {
      setIsBuffering(true);
      videoRef.current.play().catch(() => setIsBuffering(false));
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsBuffering(false);
    }
  }, [isActive, sectionInView]);

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
        <div className="relative aspect-[9/16] md:aspect-[2/3] overflow-hidden rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-lg group-hover:shadow-2xl transition-all duration-700">
          
          {/* Instant HD Poster Thumbnail (<50 KB) */}
          <Image
            src={posterSrc}
            alt={`${item.label} fragrance reel`}
            fill
            sizes="(max-width: 768px) 75vw, 350px"
            priority={index < 3}
            className={`object-cover transition-transform duration-1000 group-hover:scale-105 ${
              isPlaying ? "opacity-0" : "opacity-100"
            } transition-opacity duration-500`}
          />

          {/* Smooth Video Layer */}
          <video
            ref={videoRef}
            loop
            muted
            playsInline
            preload="none"
            poster={posterSrc}
            aria-label={`${item.label} fragrance video`}
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${
              isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
            } transition-opacity duration-500`}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              setIsPlaying(true);
            }}
            onPause={() => {
              setIsPlaying(false);
              setIsBuffering(false);
            }}
          >
            {sectionInView && (
              <source src={item.video} type={item.video.endsWith(".mp4") ? "video/mp4" : undefined} />
            )}
          </video>

          {/* Buffering Indicator */}
          {isBuffering && (isHovered || isActive) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[2px] z-20 pointer-events-none">
              <div className="w-10 h-10 border-2 border-white/30 border-t-[var(--color-gold)] rounded-full animate-spin" />
            </div>
          )}

          {/* Luxury Reel Badge */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold tracking-widest uppercase shadow-md">
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-3 w-3">
                <span className="w-0.5 bg-[var(--color-gold)] animate-[bounce_1s_infinite_100ms] h-full rounded-full" />
                <span className="w-0.5 bg-[var(--color-gold)] animate-[bounce_1s_infinite_300ms] h-2/3 rounded-full" />
                <span className="w-0.5 bg-[var(--color-gold)] animate-[bounce_1s_infinite_200ms] h-5/6 rounded-full" />
              </div>
            ) : (
              <Play className="w-3 h-3 fill-white text-white" />
            )}
            <span className="font-sans font-bold">Reel</span>
          </div>

          {/* Vignette / Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

          {/* Content & Action */}
          <div className="absolute inset-x-6 bottom-7 z-10">
            <h3 className="text-xl md:text-2xl font-serif font-bold text-white mb-3 group-hover:translate-x-1 transition-transform duration-300 drop-shadow">
              {item.label}
            </h3>

            <div className="flex items-center gap-2.5 text-xs">
              <span className="w-6 h-px bg-[var(--color-gold)]" />
              <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-gold)] group-hover:underline">
                Experience Now &rarr;
              </span>
            </div>
          </div>
        </div>

        <div className="absolute -inset-2 bg-[var(--color-gold)]/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      </Link>
    </motion.div>
  );
}
