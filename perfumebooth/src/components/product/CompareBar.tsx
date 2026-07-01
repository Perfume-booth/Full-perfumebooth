"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCompareStore } from "@/store/useCompareStore";
import { AnimatedX } from "@/components/ui/icons/AnimatedX";
import { AnimatedGitCompare } from "@/components/ui/icons/AnimatedGitCompare";
import { AnimatedTrash2 } from "@/components/ui/icons/AnimatedTrash2";

export default function CompareBar() {
  const { items, removeItem, clearItems, openCompare } = useCompareStore();

  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4"
      >
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-3xl p-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            {items.map((item) => {
              const image = item.image || (item as any).featuredImage?.url || "/placeholder-perfume.jpg";
              return (
                <motion.div
                  key={item.id}
                  layout
                  className="relative group shrink-0"
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                    <Image
                      src={image}
                      alt={item.title}
                      width={56}
                      height={56}
                      className="object-contain w-full h-full p-2 mix-blend-multiply"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <AnimatedX size={10} />
                  </button>
                </motion.div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: 4 - items.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-14 h-14 rounded-2xl border-2 border-dashed border-neutral-200 flex items-center justify-center text-neutral-300"
              >
                <AnimatedGitCompare size={16} className="opacity-20" />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={clearItems}
              className="p-3 text-neutral-400 hover:text-red-500 transition-colors"
              title="Clear All"
            >
              <AnimatedTrash2 size={18} />
            </button>
            <button
              onClick={openCompare}
              disabled={items.length < 2}
              className={`px-6 py-3 rounded-2xl text-[11px] uppercase tracking-[0.2em] font-bold transition-all ${
                items.length < 2
                  ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  : "bg-black text-white hover:bg-[var(--color-gold)] shadow-lg shadow-black/10 active:scale-95"
              }`}
            >
              Compare {items.length > 0 && `(${items.length})`}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
