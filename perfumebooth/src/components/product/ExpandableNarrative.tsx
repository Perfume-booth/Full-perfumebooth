"use client";

import { useState, useRef } from "react";
import { AnimatedChevronDown as ChevronDown } from "@/components/ui/icons/AnimatedChevronDown";
import { AnimatedChevronUp as ChevronUp } from "@/components/ui/icons/AnimatedChevronUp";
import { AnimatedRefreshCw as RefreshCw } from "@/components/ui/icons/AnimatedRefreshCw";
import { AnimatedShieldCheck as ShieldCheck } from "@/components/ui/icons/AnimatedShieldCheck";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  description: string;
  details?: {
    fragrance?: string;
    type?: string;
    gender?: string;
    season?: string;
    idealFor?: string;
    size?: string;
    category?: string;
    occasion?: string;
    material?: string;
  };
}

type Tab = "narrative" | "returns" | "details";
const TABS: Tab[] = ["narrative", "returns", "details"];

export default function ExpandableNarrative({ description, details }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("narrative");
  const [prevTab, setPrevTab] = useState<Tab>("narrative");
  const [isExpanded, setIsExpanded] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const handleTabChange = (newTab: Tab) => {
    setPrevTab(activeTab);
    setActiveTab(newTab);
  };

  const direction = TABS.indexOf(activeTab) > TABS.indexOf(prevTab) ? 1 : -1;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    
    if (Math.abs(diffX) > 60) {
      const currentIndex = TABS.indexOf(activeTab);
      if (diffX < 0 && currentIndex < TABS.length - 1) {
        handleTabChange(TABS[currentIndex + 1]);
      } else if (diffX > 0 && currentIndex > 0) {
        handleTabChange(TABS[currentIndex - 1]);
      }
    }
    touchStartX.current = null;
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0
    })
  };

  // Helper to strip ChatGPT and other unwanted utility classes from pasted descriptions
  const cleanDescriptionHTML = (html: string) => {
    if (!html) return '';
    return html
      .replace(/border-token-[^\s"']+/g, '')
      .replace(/bg-token-[^\s"']+/g, '')
      .replace(/corner-[^\s"']+/g, '')
      .replace(/cm-[^\s"']+/g, '')
      .replace(/q9tKkq[^\s"']*/g, '')
      .replace(/lxnfua[^\s"']*/g, '')
      .replace(/\bbg-[a-z0-9-]+\b/g, '')
      .replace(/\bborder\b/g, '')
      .replace(/\bborder-[a-z0-9-]+\b/g, '')
      .replace(/\brounded-[a-z0-9-]+\b/g, '')
      .replace(/\bshadow-[a-z0-9-]+\b/g, '')
      .replace(/class="\s*"/g, '');
  };

  const detailFields = [
    { label: "Fragrance", value: details?.fragrance },
    { label: "Type", value: details?.type },
    { label: "Gender", value: details?.gender },
    { label: "Season", value: details?.season },
    { label: "Ideal for", value: details?.idealFor },
    { label: "Size", value: details?.size },
    { label: "Category", value: details?.category },
    { label: "Occasion", value: details?.occasion },
    { label: "Material", value: details?.material },
  ].filter(field => field.value);

  return (
    <div className="relative w-full">
      {/* Tab Switcher */}
      <div className="w-full flex justify-start mb-8 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="relative inline-flex p-1">
          {(["narrative", "returns", "details"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`relative px-2 py-2 md:px-6 md:py-2.5 text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold transition-colors duration-300 whitespace-nowrap shrink-0 z-10 ${
                activeTab === tab
                  ? "text-black"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab === "narrative" && "The Narrative"}
              {tab === "returns" && "Returns & Replacement"}
              {tab === "details" && "Details"}
              
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 z-[-1]"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div 
        className="overflow-hidden w-full relative touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={activeTab}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.15 }
            }}
            className="w-full"
          >
            {activeTab === "narrative" && (
              <div className="w-full animate-fadeIn">
                <div
                  className={`prose prose-stone prose-sm font-light leading-relaxed text-[var(--color-text-secondary)] 
                             [&>p]:mb-4 md:[&>p]:mb-6 [&>p]:last:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-6 [&>li]:mb-2
                             first-letter:text-3xl md:first-letter:text-3xl first-letter:text-[var(--color-text-primary)]
                             ${!isExpanded ? 'max-md:line-clamp-4 max-md:overflow-hidden' : ''}`}
                  dangerouslySetInnerHTML={{ __html: cleanDescriptionHTML(description) }}
                />

                {!isExpanded && (
                  <div className="md:hidden absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[var(--color-bg)] to-transparent pointer-events-none" />
                )}

                <div className="md:hidden mt-4">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-gold)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        Show Less <ChevronUp size={14} animateOn="hover" />
                      </>
                    ) : (
                      <>
                        Read More <ChevronDown size={14} animateOn="hover" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "returns" && (
              <div className="space-y-6 py-2 w-full animate-fadeIn">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center shrink-0">
                    <RefreshCw size={18} className="text-[var(--color-gold)]" animateOn="view" />
                  </div>
                  <div>
                    <h4 className="text-[12px] uppercase tracking-[0.1em] font-bold text-[var(--color-text-primary)] mb-1">5-Day Replacement</h4>
                    <p className="text-sm font-light text-[var(--color-text-secondary)] leading-relaxed">
                      This item is non-returnable due to the nature of the product.
                      For a Damaged, Defective, Wrong or expired item, you can request a refund or replacement within 5 days of delivery.
                    </p>
                    <p className="text-sm font-light text-[var(--color-text-secondary)] leading-relaxed pt-3">
                      You will need to share the <strong className="font-bold">unboxing video and image</strong> of the item and its defects through Your Orders for a refund/replacement.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} className="text-[var(--color-gold)]" animateOn="view" />
                  </div>
                  <div>
                    <h4 className="text-[12px] uppercase tracking-[0.1em] font-bold text-[var(--color-text-primary)] mb-1">Authenticity & Hygiene</h4>
                    <p className="text-sm font-light text-[var(--color-text-secondary)] leading-relaxed">
                      To maintain the highest hygiene standards for our premium fragrances, we cannot accept returns once the product seal or outer packaging is compromised.
                    </p>
                  </div>
                </div>
              </div>
            )}
     
            {activeTab === "details" && (
              <div className="py-2 w-full animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                  {detailFields.length > 0 ? (
                    detailFields.map((field, idx) => (
                      <div key={idx} className="flex flex-col border-b border-[var(--color-border)]/30 pb-2">
                        <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-bold mb-1">
                          {field.label}
                        </span>
                        <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                          {field.value}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-light text-[var(--color-text-muted)]">No additional specifications available.</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
