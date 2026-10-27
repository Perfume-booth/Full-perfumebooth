"use client";

import { useState, useRef } from "react";
import { AnimatedChevronDown as ChevronDown } from "@/components/ui/icons/AnimatedChevronDown";
import { AnimatedChevronUp as ChevronUp } from "@/components/ui/icons/AnimatedChevronUp";
import { AnimatedRefreshCw as RefreshCw } from "@/components/ui/icons/AnimatedRefreshCw";
import { AnimatedShieldCheck as ShieldCheck } from "@/components/ui/icons/AnimatedShieldCheck";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  description: string;
  notes?: {
    top?: string;
    middle?: string;
    base?: string;
  };
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
    form?: string;
  };
}

type Tab = "narrative" | "returns" | "details";
const TABS: Tab[] = ["narrative", "returns", "details"];

export default function ExpandableNarrative({ description, notes, details }: Props) {
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
      x: dir > 0 ? 30 : -30,
      opacity: 0,
      scale: 0.99,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -30 : 30,
      opacity: 0,
      scale: 0.99,
    }),
  };

  // Helper to preserve original Shopify description HTML
  const cleanDescriptionHTML = (html: string) => {
    if (!html) return '';
    return html;
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
    { label: "Product Form", value: details?.form },
  ].filter(field => field.value);

  return (
    <div className="relative w-full">
      {/* Tab Switcher */}
      <div className="w-full flex mb-3.5 sm:mb-5 overflow-x-auto no-scrollbar scroll-smooth border-b border-[var(--color-border)]/60 pb-1">
        <div className="relative inline-flex p-1 gap-1.5 sm:gap-2">
          {(["narrative", "returns", "details"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`relative px-3.5 py-2 sm:px-6 sm:py-2.5 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.2em] font-bold transition-all duration-300 whitespace-nowrap shrink-0 z-10 rounded-lg cursor-pointer select-none ${
                activeTab === tab
                  ? "text-[#1a1410]"
                  : "text-[var(--color-text-muted)] hover:text-[#1a1410] hover:bg-black/5"
              }`}
            >
              {tab === "narrative" && "The Description"}
              {tab === "returns" && "Returns & Replacement"}
              {tab === "details" && "Details"}
              
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-[#b8924a]/15 border-b-2 border-[#b8924a] rounded-lg -z-10 shadow-xs"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
              x: { type: "spring", stiffness: 350, damping: 28 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
            className="w-full"
          >
            {activeTab === "narrative" && (
              <div className="w-full animate-fadeIn">
                <div className="relative">
                  <div
                    className={`w-full text-sm font-light leading-relaxed text-[var(--color-text-secondary)] 
                               [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[var(--color-text-primary)] [&_h1]:mb-3 [&_h1]:mt-4
                               [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[var(--color-text-primary)] [&_h2]:mb-3 [&_h2]:mt-4
                               [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[var(--color-text-primary)] [&_h3]:mb-2 [&_h3]:mt-3
                               [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-[var(--color-text-primary)] [&_h4]:mb-2 [&_h4]:mt-3
                               [&_h5]:text-sm [&_h5]:font-bold [&_h5]:text-[var(--color-text-primary)] [&_h5]:mb-2 [&_h5]:mt-2
                               [&_h6]:text-xs [&_h6]:font-bold [&_h6]:text-[var(--color-text-primary)] [&_h6]:mb-1 [&_h6]:mt-2
                               [&_p]:mb-4 [&_p]:last:mb-0
                               [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
                               [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
                               [&_li]:mb-1
                               ${!isExpanded ? 'max-md:line-clamp-4 max-md:overflow-hidden' : ''}`}
                    dangerouslySetInnerHTML={{ __html: cleanDescriptionHTML(description) }}
                  />

                  {!isExpanded && (
                    <div className="md:hidden absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[var(--color-bg)] to-transparent pointer-events-none" />
                  )}
                </div>

                <div className="md:hidden mt-2">
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

                {/* Scent Profile Area (Olfactory Pyramid) */}
                <div className="py-4 space-y-4 w-full">
                  <h5 className="text-[11px] text-center sm:text-left sm:text-[12px] uppercase tracking-[0.2em] font-bold text-[var(--color-gold)]">These are the scent notes of the product</h5>
                  <div className="flex sm:flex-row items-center sm:items-start gap-4 sm:gap-6 py-1 w-full">
                    {/* Visual Pyramid */}
                    <div className="relative w-32 h-24 sm:w-36 sm:h-28 shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                      <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-sm overflow-visible">
                        {/* Top Section (Triangle) */}
                        <path d="M50 5 L33 30 L67 30 Z" fill="url(#topGrad)" className="transition-all duration-300 hover:opacity-90 cursor-pointer" />
                        <text x="50" y="23" textAnchor="middle" fill="#7b0d1e" fontSize="5.5" fontWeight="900" letterSpacing="0.5">TOP</text>

                        {/* Middle Section (Trapezoid) */}
                        <path d="M31 33 L18 55 L82 55 L69 33 Z" fill="url(#midGrad)" className="transition-all duration-300 hover:opacity-90 cursor-pointer" />
                        <text x="50" y="47" textAnchor="middle" fill="#ffffff" fontSize="5.5" fontWeight="900" letterSpacing="0.5">HEART</text>

                        {/* Base Section (Trapezoid) */}
                        <path d="M16 58 L3 80 L97 80 L84 58 Z" fill="url(#baseGrad)" className="transition-all duration-300 hover:opacity-90 cursor-pointer" />
                        <text x="50" y="72" textAnchor="middle" fill="#ffffff" fontSize="5.5" fontWeight="900" letterSpacing="0.5">BASE</text>

                        <defs>
                          <linearGradient id="topGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fdfcfb" />
                            <stop offset="100%" stopColor="#d4bfa0" />
                          </linearGradient>
                          <linearGradient id="midGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#d4a96a" />
                            <stop offset="100%" stopColor="#b8924a" />
                          </linearGradient>
                          <linearGradient id="baseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a01428" />
                            <stop offset="100%" stopColor="#7b0d1e" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    {/* Scent Description List */}
                    <div className="flex-1 space-y-3 w-full min-w-0">
                      <div className="flex items-start gap-3 border-l-2 border-[#b8924a]/30 pl-3 sm:pl-3.5 py-0.5">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase tracking-[0.18em] font-black text-[var(--color-gold)]">Top Notes</span>
                          <span className="text-xs sm:text-[13px] font-light text-[var(--color-text-primary)] leading-snug break-words">
                            {notes?.top || "Citrus, Bergamot & Fresh Ozone"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-l-2 border-[#b8924a]/60 pl-3 sm:pl-3.5 py-0.5">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase tracking-[0.18em] font-black text-[var(--color-gold)]">Heart (Middle) Notes</span>
                          <span className="text-xs sm:text-[13px] font-light text-[var(--color-text-primary)] leading-snug break-words">
                            {notes?.middle || "Jasmine, Lavender & Soft Floral Accords"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-l-2 border-[#7b0d1e]/80 pl-3 sm:pl-3.5 py-0.5">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase tracking-[0.18em] font-black text-[var(--color-maroon)]">Base Notes</span>
                          <span className="text-xs sm:text-[13px] font-light text-[var(--color-text-primary)] leading-snug break-words">
                            {notes?.base || "Warm Amber, Patchouli, Sensual Musk & Cedarwood"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
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
                      This item is non-returnable due to hygiene and authenticity reasons. If you receive a damaged, defective, incorrect, or expired item, you may request a replacement or refund within 5 days of delivery.
                    </p>
                    <p className="text-sm font-light text-[var(--color-text-secondary)] leading-relaxed pt-3">
                      Please provide an <strong className="font-bold">unboxing video and clear images</strong> for verification.
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
