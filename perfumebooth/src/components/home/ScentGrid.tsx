"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import Carousel from "@/components/ui/Carousel";

const SCENT_JOURNEY_DATA = [
  {
    label: "Oud",
    mood: "Deep, Mystical, Regal",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/woody.webp?v=1784546288",
    href: "/oud",
  },
  {
    label: "Floral",
    mood: "Elegant, Blooming, Romantic",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/floral.webp?v=1784546289",
    href: "/floral",
  },
  {
    label: "Citrus",
    mood: "Zesty, Energetic, Bright",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/fresh-citrus.webp?v=1784546288",
    href: "/citrus",
  },
  {
    label: "Woody",
    mood: "Earthy, Grounded, Warm",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/earthy-woody.webp?v=1784546291",
    href: "/woody",
  },
  {
    label: "Aquatic",
    mood: "Cool, Serene, Breathless",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/aquatic_1.webp?v=1784546289",
    href: "/aquatic",
  },
  {
    label: "Spicy",
    mood: "Bold, Intriguing, Fiery",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/spicy_1.webp?v=1784546289",
    href: "/spicy",
  },
  {
    label: "Oriental",
    mood: "Exotic, Rich, Enchanting",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/oriental_1.webp?v=1784546289",
    href: "/oriental",
  },
  {
    label: "Fresh",
    mood: "Clean, Crisp, Vital",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/fresh.webp?v=1784546288",
    href: "/fresh",
  },
];

export default function ScentGrid() {
  return (
    <section className="py-4 md:py-10 bg-[var(--color-bg)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">
        
        <SectionHeader 
          title="The" 
          italicPart="Art" 
          suffix="of Scent Notes" 
          viewAllLink="/all"
        />

        <div className="mt-8">
          <Carousel 
            containerClassName="gap-6 md:gap-10"
            slideClassName="basis-[85vw] md:basis-[300px]"
            options={{ align: "start", containScroll: "trimSnaps", dragFree: true }}
            showDots={true}
          >
            {SCENT_JOURNEY_DATA.map((note, index) => (
              <motion.div
                key={note.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="group"
              >
                <Link 
                  href={note.href} 
                  className="block relative"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-lg group-hover:shadow-2xl transition-all duration-700">
                    <Image
                      src={note.image}
                      alt={note.label}
                      fill
                      className="object-cover transition-transform duration-1000 group-hover:scale-110"
                      sizes="(max-width: 768px) 85vw, 400px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                    <div className="absolute inset-x-8 bottom-10 z-10">
                      <p className="text-[var(--color-gold)] text-[9px] uppercase tracking-[0.4em] font-bold mb-3 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                        {note.mood}
                      </p>
                      <h3 className="text-3xl md:text-4xl font-serif text-white mb-6 group-hover:translate-x-2 transition-transform duration-500">
                        {note.label}
                      </h3>
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                        <span className="w-12 h-px bg-[var(--color-gold)]" />
                        <span className="text-[10px] uppercase tracking-[0.3em] text-white">Find Your Scent</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -inset-4 bg-[var(--color-gold)]/5 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                </Link>
              </motion.div>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}