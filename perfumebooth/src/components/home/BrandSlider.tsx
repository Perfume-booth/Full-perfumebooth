"use client";

import Image from "next/image";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import Carousel from "@/components/ui/Carousel";

const FEATURED_BRANDS = [
  { name: "Otoori", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori.png?v=1778136280", href: "/otoori" },
  { name: "New NB", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/new.png?v=1778136280", href: "/new-nb" },
  { name: "Lomani", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/lomani_e0e49660-4025-4d49-a39a-917abc67ff8b.png?v=1778136280", href: "/lomani" },
  { name: "MPF", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf_d95f9db9-b52a-4894-8e31-92e11b2d5342.png?v=1778136279", href: "/mpf" },
  { name: "Prestige Arabiyat", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/arabiyat.png?v=1778136278", href: "/arabiyat-prestige" },
  { name: "Lattaffa", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/lattaffa.png?v=1778136279", href: "/lattaffa" },
  { name: "Swiss Arabian", logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/swiss.png?v=1778136279", href: "/swiss-arabian" },
];

export default function BrandSlider() {
  return (
    <section className="py-4 md:py-10 border-y border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">

        <SectionHeader
          title="Global"
          italicPart="Brands"
          viewAllLink="/brands"
          viewAllText="Explore All"
        />

        <div className="mt-8">
          <Carousel 
            containerClassName="gap-4 md:gap-6 md:justify-center"
            slideClassName="basis-[33%] sm:basis-[25%] md:basis-[176px]"
            options={{ align: "start", containScroll: "trimSnaps", dragFree: true, loop: true }}
            autoplay={true}
            autoplayDelay={3000}
            showArrows={true}
          >
            {FEATURED_BRANDS.map((brand) => (
              <Link key={brand.name} href={brand.href || "#"} className="group/brand block">
                <div className="relative aspect-square bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-sm group-hover/brand:shadow-md group-hover/brand:border-[var(--color-gold)] transition-all duration-500 overflow-hidden rounded-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--color-gold)]/5 opacity-0 group-hover/brand:opacity-100 transition-opacity duration-700" />
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    fill
                    className="p-4 md:p-6 object-contain transition-all duration-700 filter group-hover/brand:scale-110"
                    sizes="(max-width: 768px) 112px, 176px"
                  />
                </div>
                <p className="mt-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-center opacity-0 group-hover/brand:opacity-100 transition-all duration-500 transform translate-y-2 group-hover/brand:translate-y-0">
                  {brand.name}
                </p>
              </Link>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
