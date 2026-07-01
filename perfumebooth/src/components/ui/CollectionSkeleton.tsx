"use client";

import React from "react";
import { motion } from "framer-motion";

const SkeletonCard = () => (
  <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-[#ede6dc]/40 h-full">
    {/* Image Area Skeleton */}
    <div className="relative aspect-square bg-[#faf7f2] overflow-hidden">
      <motion.div 
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg]"
      />
    </div>

    {/* Content Area Skeleton */}
    <div className="p-3 sm:p-4 flex flex-col flex-grow bg-white space-y-3">
      {/* Brand */}
      <div className="relative h-3 w-1/3 bg-[#faf7f2] rounded overflow-hidden">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.1 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
        />
      </div>
      
      {/* Title */}
      <div className="space-y-2">
        <div className="relative h-5 w-full bg-[#faf7f2] rounded overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
          />
        </div>
        <div className="relative h-5 w-4/5 bg-[#faf7f2] rounded overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.3 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
          />
        </div>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="relative w-3 h-3 bg-[#faf7f2] rounded-full overflow-hidden">
             <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.4 + (i * 0.05) }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
            />
          </div>
        ))}
      </div>

      {/* Price & Action */}
      <div className="mt-auto pt-6 flex items-center justify-between border-t border-[#ede6dc]/40">
        <div className="relative h-6 w-24 bg-[#faf7f2] rounded overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.5 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
          />
        </div>
        <div className="relative h-10 w-10 bg-[#faf7f2] rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.6 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
          />
        </div>
      </div>
    </div>
  </div>
);

export const CollectionSkeleton = ({ count = 8 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};
