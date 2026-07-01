"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface FeaturedBrandsProps {
  brands: string[];
}

export default function FeaturedBrands({ brands }: FeaturedBrandsProps) {
  return (
    <section className="mb-24">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-gold)] font-bold mb-3">The Elite Collection</h2>
          <h3 className="text-3xl lg:text-5xl font-serif font-bold text-gray-900">
            Featured <span className="italic">Houses</span>
          </h3>
        </div>
        <div className="hidden md:block h-px flex-1 mx-10 bg-gray-100 mb-4"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map((brand, index) => {
          const slug = brand.toLowerCase().replace(/\s+/g, '-');
          return (
            <motion.div
              key={brand}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Link
                href={`/${slug}`}
                className="group relative block aspect-[16/9] overflow-hidden rounded-2xl bg-[#faf7f2] border border-[#f0ebe1] hover:border-[var(--color-gold)] transition-all duration-500"
              >
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                   <span className="text-8xl font-serif font-bold italic select-none">{brand[0]}</span>
                </div>

                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                  <div className="space-y-1">
                     <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold">Fragrance House</span>
                     <h4 className="text-2xl font-serif font-bold text-gray-900 group-hover:text-[var(--color-gold)] transition-colors">
                       {brand}
                     </h4>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-500 group-hover:text-black transition-colors">
                    Explore Collection
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Hover overlay shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
