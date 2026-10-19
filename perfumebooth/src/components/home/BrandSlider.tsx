"use client";

import { motion } from "framer-motion";
import SectionHeader from "@/components/ui/SectionHeader";
import CircleRevealSection from "@/components/ui/CircleRevealSection";
import Carousel from "@/components/ui/Carousel";
import BrandCard from "@/components/brand/BrandCard";

const FEATURED_BRANDS = [
  { name: "Otoori", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori-logo-beverly-web.jpg?v=1787650165", href: "/otoori" },
  { name: "New NB", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/new-nb-logo-beverly-web.jpg?v=1787650165", href: "/new-nb" },
  { name: "Lomani", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/lomani-logo-beverly-web.jpg?v=1787650165", href: "/lomani" },
  { name: "MPF", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf-logo-beverly-web.jpg?v=1787650165", href: "/mpf" },
  { name: "Arabiyat Prestige", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/arabiyat-prestige-logo-beverly-web.jpg?v=1787650165", href: "/arabiyat-prestige" },
  { name: "Al Haramain", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-haramain-logo-beverly-web.jpg?v=1787650166", href: "/al-haramain" },
  { name: "Anfar", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/anfar-logo-beverly-web.jpg?v=1787650165", href: "/anfar" },
  { name: "Caneza", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/caneza-logo-beverly-web.jpg?v=1787650165", href: "/caneza" },
  { name: "Al Wataniyah", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/an-wataniah-logo-beverly-web.jpg?v=1787650166", href: "/al-watania" },
];

export default function BrandSlider({
  brands,
  title = "Global",
  italicPart = "Brands"
}: {
  brands?: any[];
  title?: string;
  italicPart?: string;
} = {}) {
  const luxuryEase = [0.16, 1, 0.3, 1] as const;
  const displayBrands = brands && brands.length > 0 ? brands : FEATURED_BRANDS;

  return (
    <CircleRevealSection origin="arch" className="bg-[var(--color-bg)] relative z-10">
      <section className="pt-10 pb-8 md:pt-14 md:pb-12 border-y border-[var(--color-border)] overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 lg:px-16">
          <SectionHeader
            align="center"
            title={title}
            italicPart={italicPart}
          />

          <motion.div 
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.9, delay: 0.15, ease: luxuryEase }}
            className="mt-8 will-change-transform"
          >
            <Carousel 
              containerClassName="-ml-4 md:-ml-6"
              slideClassName="pl-4 md:pl-6 basis-[75%] sm:basis-[48%] md:basis-[300px] lg:basis-[330px]"
              options={{ align: "start", containScroll: "trimSnaps", dragFree: true, loop: true }}
              autoplay={true}
              autoplayDelay={3500}
              showArrows={true}
            >
              {displayBrands.map((brand: any, idx: number) => (
                <motion.div
                  key={brand.name}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px" }}
                  transition={{
                    duration: 0.75,
                    delay: 0.1 + (idx % 4) * 0.08,
                    ease: luxuryEase
                  }}
                  className="w-full h-full will-change-transform"
                >
                  <BrandCard
                    name={brand.name}
                    logo={brand.logo}
                    href={brand.href || "#"}
                  />
                </motion.div>
              ))}
            </Carousel>
          </motion.div>
        </div>
      </section>
    </CircleRevealSection>
  );
}
