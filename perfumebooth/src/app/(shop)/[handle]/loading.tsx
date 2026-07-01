"use client";

import { CollectionSkeleton } from "@/components/ui/CollectionSkeleton";
import { motion } from "framer-motion";

export default function Loading() {
  return (
    <main className="pt-28 md:pt-40">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Banner Skeleton */}
        <div className="relative w-full aspect-[21/9] md:aspect-[20/5] bg-[#faf7f2] rounded-2xl md:rounded-3xl overflow-hidden mb-12 border border-[#ede6dc]/40 hidden md:block">
           <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg]"
          />
        </div>

        {/* Grid Skeleton */}
        <div className="py-12">
           <CollectionSkeleton count={12} />
        </div>
      </div>
    </main>
  );
}
