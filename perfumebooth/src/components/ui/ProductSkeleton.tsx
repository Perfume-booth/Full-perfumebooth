"use client";

import React from "react";
import { motion } from "framer-motion";

const Shimmer = ({ delay = 0 }) => (
  <motion.div 
    initial={{ x: "-100%" }}
    animate={{ x: "100%" }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay }}
    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
  />
);

export const ProductSkeleton = () => {
  return (
    <div 
      className="flex flex-col w-full h-full min-h-screen bg-[var(--color-bg)] pt-28 md:pt-40"
      role="status"
      aria-live="polite"
      aria-label="Loading product details..."
    >
      <span className="sr-only">Loading product details, please wait...</span>
      {/* Breadcrumbs Skeleton */}
      <div className="hidden md:block max-w-7xl mx-auto w-full py-6 px-4 md:px-6 mb-8">
        <div className="relative h-4 w-64 bg-[#faf7f2] rounded overflow-hidden">
          <Shimmer />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-20">
          
          {/* Gallery Skeleton */}
          <div className="lg:col-span-7 w-full">
            <div className="flex flex-col md:flex-row gap-4 h-full">
              {/* Main Image */}
              <div className="flex-1 aspect-[4/5] bg-[#faf7f2] rounded-2xl relative overflow-hidden">
                <Shimmer />
              </div>
              {/* Thumbnails (desktop) */}
              <div className="hidden md:flex flex-col gap-4 w-20">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-square bg-[#faf7f2] rounded-xl relative overflow-hidden">
                    <Shimmer delay={i * 0.1} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Details Skeleton */}
          <div className="lg:col-span-5 w-full space-y-10">
            {/* Title & Brand */}
            <div className="space-y-4">
              <div className="relative h-4 w-24 bg-[#faf7f2] rounded overflow-hidden">
                <Shimmer delay={0.2} />
              </div>
              <div className="relative h-10 w-full bg-[#faf7f2] rounded-lg overflow-hidden">
                <Shimmer delay={0.3} />
              </div>
              <div className="relative h-4 w-32 bg-[#faf7f2] rounded overflow-hidden">
                <Shimmer delay={0.4} />
              </div>
            </div>

            {/* Price Area */}
            <div className="space-y-4">
              <div className="relative h-12 w-48 bg-[#faf7f2] rounded-xl overflow-hidden">
                <Shimmer delay={0.5} />
              </div>
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="relative h-8 w-20 bg-[#faf7f2] rounded-full overflow-hidden">
                    <Shimmer delay={0.6 + i * 0.1} />
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-[#ede6dc]/40" />

            {/* Actions Area */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="relative h-16 w-32 bg-[#faf7f2] rounded-xl overflow-hidden">
                  <Shimmer delay={0.7} />
                </div>
                <div className="relative h-16 flex-grow bg-[#faf7f2] rounded-xl overflow-hidden">
                  <Shimmer delay={0.8} />
                </div>
              </div>
              <div className="relative h-16 w-full bg-[#faf7f2] rounded-xl overflow-hidden">
                <Shimmer delay={0.9} />
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 pt-10">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="relative h-20 bg-[#faf7f2] rounded-2xl overflow-hidden">
                  <Shimmer delay={1 + i * 0.1} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
