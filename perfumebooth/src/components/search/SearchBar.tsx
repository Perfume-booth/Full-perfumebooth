"use client";

import React, { useState, useRef, useEffect } from "react";
import { AnimatedSearch } from "@/components/ui/icons/AnimatedSearch";
import { AnimatedX } from "@/components/ui/icons/AnimatedX";
import { AnimatedLoader2 } from "@/components/ui/icons/AnimatedLoader2";
import { AnimatedArrowRight } from "@/components/ui/icons/AnimatedArrowRight";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { TOP_BRANDS } from "@/lib/constants";
import { getBrandFromTags } from "@/lib/transformers";

interface SuggestionProduct {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  tags?: string[];
  featuredImage?: { url: string; altText?: string };
  priceRange: { minVariantPrice: { amount: string } };
}

interface SearchBarProps {
  variant?: "desktop" | "mobile";
  className?: string;
}

export default function SearchBar({ variant = "desktop", className }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const debouncedQuery = useDebounce(query, 300);

  const POPULAR = ["Oud", "Floral", "Musk", "Sandalwood", "Citrus"];

  useEffect(() => {
    if (isOpen && inputRef.current && variant === "desktop") inputRef.current.focus();
  }, [isOpen, variant]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestions = async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&first=10`, {
        signal: controller.signal,
      });
      const data = await res.json();
      setSuggestions(data.products || []);
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Expected cancellation, don't clear suggestions
        return;
      }
      console.error("Search fetch error:", err);
      setSuggestions([]);
    } finally {
      // Only set loading false if this was the last initiated request
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };


  useEffect(() => {
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery]);

  const handleInput = (value: string) => {
    setQuery(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim().toLowerCase();
    
    if (cleanQuery) {
      // 1. Direct Keyword Redirects (Smart Search)
      const redirects: Record<string, string> = {
        "men": "/men",
        "man": "/men",
        "women": "/women",
        "woman": "/women",
        "perfume": "/perfumes",
        "perfumes": "/perfumes",
        "attar": "/attars",
        "attars": "/attars",
        "deodorant": "/deodorants",
        "deodorants": "/deodorants",
        "gift set": "/gift-sets",
        "gift sets": "/gift-sets",
        "scent shot": "/scent-shot",
        "scent shots": "/scent-shot",
        "mist": "/mist",
        "body mist": "/mist",
        "new": "/new",
        "new arrival": "/new",
        "new arrivals": "/new",
        "luxury": "/all",
        "offer": "/sale",
        "offers": "/sale",
        "sale": "/sale",
        "oud": "/oud",
        "floral": "/floral",
        "citrus": "/citrus",
        "woody": "/woody",
        "aquatic": "/aquatic",
        "spicy": "/spicy",
        "oriental": "/oriental",
      };

      // 2. Brand Redirects (Dynamic from TOP_BRANDS)
      const brandRedirect = TOP_BRANDS.find((b: string) => b.toLowerCase() === cleanQuery);
      
      if (redirects[cleanQuery]) {
        router.push(redirects[cleanQuery]);
      } else if (brandRedirect) {
        const brandHandle = brandRedirect.toLowerCase().replace(/\s+/g, '-');
        router.push(`/${brandHandle}`);
      } else {
        // Fallback to standard search
        router.push(`/all?q=${encodeURIComponent(query.trim())}`);
      }

      setIsOpen(false);
      setShowMobileOverlay(false);
    }
  };

  if (variant === "mobile") {
    return (
      <>
        <button
          onClick={() => setShowMobileOverlay(true)}
          className="p-2 text-gray-700 hover:text-black transition-colors"
          aria-label="Search"
          suppressHydrationWarning={true}
        >
          <AnimatedSearch size={22} strokeWidth={2} />
        </button>

        <AnimatePresence>
          {showMobileOverlay && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-[300] bg-white flex flex-col"
            >
              <div className="flex items-center px-4 py-3 border-b border-gray-100">
                <button onClick={() => setShowMobileOverlay(false)} className="mr-3">
                  <AnimatedX size={24} />
                </button>
                <form onSubmit={handleSubmit} className="flex-1">
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => handleInput(e.target.value)}
                    suppressHydrationWarning
                    className="w-full text-base font-medium focus:outline-none"
                    placeholder="Search for perfume, brands etc."
                  />
                </form>
                {query && (
                  <button onClick={() => setQuery("")} className="text-gray-400">
                    <AnimatedX size={16} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {query.trim() === "" ? (
                   <div className="space-y-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-4">Popular Searches</p>
                        <div className="flex flex-wrap gap-2">
                          {POPULAR.map((term) => (
                            <button
                              key={term}
                              onClick={() => { setQuery(term); fetchSuggestions(term); }}
                              className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-700 font-medium"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                   </div>
                ) : (
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex justify-center py-12">
                        <AnimatedLoader2 className="animate-spin text-gray-300" />
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {suggestions.map((p) => (
                          <Link
                            key={p.id}
                            href={`/products/${p.handle}`}
                            onClick={() => setShowMobileOverlay(false)}
                            className="flex items-center gap-4 py-4 active:bg-gray-50 transition-colors"
                          >
                            <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden relative border border-gray-100 flex-shrink-0">
                               {p.featuredImage?.url && (
                                 <Image 
                                   src={p.featuredImage.url} 
                                   alt={p.title} 
                                   fill 
                                   className="object-cover" 
                                   sizes="64px"
                                 />
                               )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-0.5">
                                <p className="text-[14px] font-bold text-gray-800 line-clamp-2">{p.title}</p>
                                <span className="text-[13px] font-semibold text-gray-900 ml-2">
                                  Rs. {parseFloat(p.priceRange.minVariantPrice.amount).toFixed(0)}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 uppercase tracking-wide">
                                {getBrandFromTags(p.tags) || "Perfume Booth"}
                              </p>
                            </div>
                            <AnimatedArrowRight size={16} className="text-gray-300 ml-2" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div className="flex items-center bg-[#f5f5f6] border-[0.5px] border-gray-300 rounded-lg px-4 py-1.5 transition-all focus-within:bg-white focus-within:border-gray-200">
        <AnimatedSearch size={16} strokeWidth={1.5} className="text-gray-400 flex-shrink-0" />
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => setIsOpen(true)}
            suppressHydrationWarning
            className="w-full bg-transparent border-none px-3 text-[13px] text-gray-700 focus:outline-none placeholder:text-gray-500 font-medium h-7"
            placeholder="Search for products"
            type="text"
          />
        </form>
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
            <AnimatedX size={14} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            className="absolute left-0 right-0 md:-left-12 md:-right-12 top-full mt-2 bg-white border border-gray-100 shadow-2xl z-[150] overflow-hidden rounded-xl"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <AnimatedLoader2 size={24} className="animate-spin text-gray-300" />
              </div>
            ) : suggestions.length > 0 ? (
              <div className="py-4">
                <div className="px-5 mb-3 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Search Results</p>
                  <p className="text-[10px] text-gray-400">{suggestions.length} products found</p>
                </div>
                <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {suggestions.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.handle}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-5 px-5 py-3 hover:bg-gray-50 transition-all group"
                    >
                      <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden relative border border-gray-100 group-hover:border-gray-200 transition-colors">
                        {product.featuredImage?.url && (
                          <Image 
                            src={product.featuredImage.url} 
                            alt={product.title} 
                            fill 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            sizes="56px"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[14px] font-bold text-gray-800 truncate group-hover:text-black transition-colors">{product.title}</p>
                          <span className="text-[12px] font-medium text-gray-900 ml-2">
                             Rs. {parseFloat(product.priceRange.minVariantPrice.amount).toFixed(0)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 uppercase tracking-wider">
                          {getBrandFromTags(product.tags) || "Perfume Booth"}
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <AnimatedArrowRight size={16} className="text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
                <div className="px-4 py-12 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                       <AnimatedSearch size={20} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No results found for &quot;{query}&quot;</p>
                    <p className="text-xs text-gray-400 mt-1 italic">Try checking your spelling or use more general terms</p>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

