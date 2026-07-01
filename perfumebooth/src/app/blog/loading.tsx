"use client";

import { motion } from "framer-motion";

const Shimmer = () => (
  <motion.div 
    initial={{ x: "-100%" }}
    animate={{ x: "100%" }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
  />
);

export default function Loading() {
  return (
    <main className="pt-28 md:pt-40 min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Blog Header */}
        <div className="py-12 space-y-4 text-center">
          <div className="h-4 w-32 bg-[#faf7f2] rounded mx-auto overflow-hidden relative">
            <Shimmer />
          </div>
          <div className="h-10 w-64 bg-[#faf7f2] rounded-lg mx-auto overflow-hidden relative">
            <Shimmer />
          </div>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-[16/9] bg-[#faf7f2] rounded-2xl overflow-hidden relative">
                <Shimmer />
              </div>
              <div className="h-6 w-full bg-[#faf7f2] rounded overflow-hidden relative">
                <Shimmer />
              </div>
              <div className="h-4 w-2/3 bg-[#faf7f2] rounded overflow-hidden relative">
                <Shimmer />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
