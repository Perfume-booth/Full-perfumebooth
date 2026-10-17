"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowUpRight, Clock, X, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { TOP_BRANDS } from "@/lib/constants";
import { cleanCategoryName } from "@/lib/transformers";

interface SuggestionProduct {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  category?: string;
  gender?: string;
  productType?: string;
  tags?: string[];
  featuredImage?: { url: string; altText?: string };
  image?: string;
  priceRange?: { minVariantPrice: { amount: string } };
}

interface SearchBarProps {
  variant?: "desktop" | "mobile";
  className?: string;
}

const POPULAR_SEARCHES = ["Oud", "Floral", "Vanilla", "Musk", "Citrus", "Amber", "Daily Wear"];

export default function SearchBar({ variant = "desktop", className }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 250);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pb_recent_searches");
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to load recent searches:", err);
      }
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    try {
      const updated = [cleaned, ...recentSearches.filter((s) => s.toLowerCase() !== cleaned.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("pb_recent_searches", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save recent search:", err);
    }
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const updated = recentSearches.filter((s) => s !== term);
      setRecentSearches(updated);
      localStorage.setItem("pb_recent_searches", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to remove recent search:", err);
    }
  };

  const clearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      setRecentSearches([]);
      localStorage.removeItem("pb_recent_searches");
    } catch (err) {
      console.error("Failed to clear recent searches:", err);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&first=8`, {
        signal: controller.signal,
      });
      const data = await res.json();
      setSuggestions(data.products || []);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Search fetch error:", err);
      setSuggestions([]);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(debouncedQuery);
    setSelectedIndex(-1);
  }, [debouncedQuery, fetchSuggestions]);

  // Navigate to query or product
  const navigateToSearch = (searchTerm: string) => {
    const cleanQuery = searchTerm.trim().toLowerCase();
    if (!cleanQuery) return;

    saveRecentSearch(searchTerm.trim());

    // Keyword redirects
    const redirects: Record<string, string> = {
      men: "/men",
      man: "/men",
      women: "/women",
      woman: "/women",
      perfume: "/perfumes",
      perfumes: "/perfumes",
      attar: "/attars",
      attars: "/attars",
      deodorant: "/deodorants",
      deodorants: "/deodorants",
      "gift set": "/gift-sets",
      "gift sets": "/gift-sets",
      "scent shot": "/scent-shot",
      mist: "/mist",
      "body mist": "/mist",
      new: "/new",
      sale: "/sale",
      oud: "/oud",
      floral: "/floral",
      citrus: "/citrus",
      woody: "/woody",
      spicy: "/spicy",
      oriental: "/oriental",
    };

    const brandRedirect = TOP_BRANDS.find((b: string) => b.toLowerCase() === cleanQuery);

    if (redirects[cleanQuery]) {
      router.push(redirects[cleanQuery]);
    } else if (brandRedirect) {
      const brandHandle = brandRedirect.toLowerCase().replace(/\s+/g, "-");
      router.push(`/${brandHandle}`);
    } else {
      router.push(`/all?q=${encodeURIComponent(searchTerm.trim())}`);
    }

    setIsOpen(false);
    setShowMobileOverlay(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      const selected = suggestions[selectedIndex];
      saveRecentSearch(selected.title);
      router.push(`/products/${selected.handle}`);
      setIsOpen(false);
      setShowMobileOverlay(false);
      return;
    }
    navigateToSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Helper for Category Subtitle format (clean fragrance classification)
  const getCategorySubtitle = (product: SuggestionProduct) => {
    const parts: string[] = [];

    // Prioritize clean fragrance classification (e.g., "Eau de Parfum", "Attar", "Extrait de Parfum")
    const cleanType = cleanCategoryName(product.productType);
    const cleanCat = cleanCategoryName(product.category);

    const validCategory =
      cleanType && cleanType.toLowerCase() !== "fragrances"
        ? cleanType
        : cleanCat && cleanCat.toLowerCase() !== "fragrances"
        ? cleanCat
        : cleanType || cleanCat;

    if (validCategory && validCategory.toLowerCase() !== "uncategorized") {
      parts.push(validCategory);
    } else if (product.vendor && product.vendor !== "Perfume Booth") {
      parts.push(product.vendor);
    } else {
      parts.push("Eau de Parfum");
    }

    if (product.gender && product.gender.toLowerCase() !== "unisex") {
      parts.unshift(product.gender);
    }

    return parts.join(" • ") || "Eau de Parfum";
  };

  // Substring highlight helper with high-contrast text
  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="text-[#b8924a] font-bold">
              {part}
            </span>
          ) : (
            <span key={i} className="text-gray-900 font-medium">{part}</span>
          )
        )}
      </>
    );
  };

  // --------------------------------------------------------------------------
  // Mobile Search Overlay View (Clean Light Mode)
  // --------------------------------------------------------------------------
  if (variant === "mobile") {
    return (
      <>
        <button
          onClick={() => setShowMobileOverlay(true)}
          className="p-2 text-gray-700 hover:text-black transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5 text-gray-700" />
        </button>

        <AnimatePresence>
          {showMobileOverlay && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed inset-0 z-[300] bg-white flex flex-col"
            >
              {/* Top search bar */}
              <div className="flex items-center px-4 py-3 border-b border-gray-200 gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => setShowMobileOverlay(false)}
                  className="p-1 text-gray-600 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
                <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none placeholder:text-gray-400"
                    placeholder="Search for perfumes, notes, brands..."
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-gray-400 hover:text-gray-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </form>
              </div>

              {/* Suggestions / History list */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
                {query.trim() === "" ? (
                  <div className="p-4 flex flex-col gap-6">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                            Recent Searches
                          </span>
                          <button
                            type="button"
                            onClick={clearAllRecent}
                            className="text-xs text-[#b8924a] font-bold hover:underline"
                          >
                            Clear All
                          </button>
                        </div>
                        {recentSearches.map((term) => (
                          <div
                            key={term}
                            onClick={() => {
                              setQuery(term);
                              navigateToSearch(term);
                            }}
                            className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50 rounded-xl cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-semibold text-gray-900">{term}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => removeRecentSearch(term, e)}
                              className="text-gray-400 hover:text-gray-700 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Popular searches pills */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#b8924a]" /> Popular Searches
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              setQuery(term);
                              navigateToSearch(term);
                            }}
                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-800 hover:bg-gray-200 transition"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-[#b8924a]" />
                  </div>
                ) : suggestions.length > 0 ? (
                  <div>
                    {suggestions.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => {
                          saveRecentSearch(product.title);
                          router.push(`/products/${product.handle}`);
                          setShowMobileOverlay(false);
                        }}
                        className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {product.featuredImage?.url || product.image ? (
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
                              <Image
                                src={product.featuredImage?.url || product.image || ""}
                                alt={product.title}
                                width={44}
                                height={44}
                                className="w-full h-full object-contain p-0.5"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-gray-100 border border-gray-200/60 shrink-0 flex items-center justify-center text-gray-400">
                              <Search className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {highlightMatch(product.title, query)}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-gray-500 truncate font-medium">
                                {getCategorySubtitle(product)}
                              </span>
                              {product.priceRange?.minVariantPrice?.amount && parseFloat(product.priceRange.minVariantPrice.amount) > 0 && (
                                <>
                                  <span className="text-gray-300 text-xs">•</span>
                                  <span className="text-xs font-bold text-gray-900 shrink-0">
                                    ₹{Math.round(parseFloat(product.priceRange.minVariantPrice.amount)).toLocaleString("en-IN")}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setQuery(product.title);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-900 shrink-0 ml-2"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-sm font-semibold text-gray-900">No results found for &quot;{query}&quot;</p>
                    <p className="text-xs text-gray-400 mt-1">Try searching by brand, notes (e.g., Vanilla, Oud), or category.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // --------------------------------------------------------------------------
  // Desktop Search View (Clean White Background, High Contrast Text)
  // --------------------------------------------------------------------------
  return (
    <div ref={wrapperRef} className={cn("relative w-full max-w-xl", className)}>
      {/* Search Input Box: Clean Light Gray Surface with border */}
      <div className="flex items-center bg-[#f4f4f6] hover:bg-[#eeeff1] border border-gray-300/80 rounded-full px-4 py-1.5 transition-all focus-within:bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-[#b8924a]/20 shadow-sm">
        <Search className="w-4 h-4 text-gray-500 flex-shrink-0 mr-2" />
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none text-[13px] text-gray-900 focus:outline-none placeholder:text-gray-500 font-medium h-7"
            placeholder="Search for perfume, brands, scent notes..."
            type="text"
            autoComplete="off"
            spellCheck="false"
          />
        </form>
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="text-gray-400 hover:text-gray-700 p-1 transition"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown: Pure White Background with Clean Border & Shadow */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 shadow-2xl z-[150] rounded-2xl overflow-hidden"
          >
            {/* 1. Blank state: Recent & Popular Searches */}
            {query.trim() === "" ? (
              <div className="p-4 flex flex-col gap-4 bg-white">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between pb-1 px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={clearAllRecent}
                        className="text-[11px] text-[#b8924a] font-bold hover:text-[#87652a] hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        onClick={() => {
                          setQuery(term);
                          navigateToSearch(term);
                        }}
                        className="flex items-center justify-between py-2 px-3 hover:bg-gray-100 rounded-xl cursor-pointer group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#b8924a] transition-colors" />
                          <span className="text-xs font-semibold text-gray-900 group-hover:text-black transition-colors">
                            {term}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(term, e)}
                          className="text-gray-400 hover:text-gray-700 p-1 transition"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Popular Searches */}
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 px-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#b8924a]" /> Popular Searches
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SEARCHES.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          navigateToSearch(term);
                        }}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 hover:bg-gray-200 border border-gray-200/90 text-gray-800 hover:text-black transition cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-500 text-xs font-medium bg-white">
                <Loader2 className="w-4 h-4 animate-spin text-[#b8924a]" />
                <span>Searching fragrances...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="py-2 flex flex-col bg-white">
                {/* Header info */}
                <div className="px-4 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <span>Suggestions</span>
                  <span>{suggestions.length} items</span>
                </div>

                {/* Scoped Autocomplete List Items */}
                <div className="max-h-[60vh] overflow-y-auto">
                  {suggestions.map((product, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={product.id}
                        onClick={() => {
                          saveRecentSearch(product.title);
                          router.push(`/products/${product.handle}`);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors group border-b border-gray-50 last:border-0",
                          isSelected
                            ? "bg-gray-100 text-gray-900"
                            : "hover:bg-gray-50"
                        )}
                      >
                        {/* Left Product Thumbnail & Text Column */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {product.featuredImage?.url || product.image ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
                              <Image
                                src={product.featuredImage?.url || product.image || ""}
                                alt={product.title}
                                width={40}
                                height={40}
                                className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-200"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200/60 shrink-0 flex items-center justify-center text-gray-400 group-hover:text-[#b8924a] transition-colors">
                              <Search className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-black transition-colors leading-snug">
                              {highlightMatch(product.title, query)}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-gray-500 font-medium truncate">
                                {getCategorySubtitle(product)}
                              </span>
                              {product.priceRange?.minVariantPrice?.amount && parseFloat(product.priceRange.minVariantPrice.amount) > 0 && (
                                <>
                                  <span className="text-gray-300 text-[10px]">•</span>
                                  <span className="text-[11px] font-bold text-gray-900 shrink-0">
                                    ₹{Math.round(parseFloat(product.priceRange.minVariantPrice.amount)).toLocaleString("en-IN")}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Jump Arrow */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setQuery(product.title);
                            inputRef.current?.focus();
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200/70 rounded-lg transition-colors ml-2 shrink-0"
                          title="Use suggestion"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom View All Link */}
                <button
                  type="button"
                  onClick={() => navigateToSearch(query)}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#b8924a] hover:bg-gray-50 border-t border-gray-100 flex items-center justify-between transition cursor-pointer"
                >
                  <span>See all results for &quot;{query}&quot;</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-gray-600 bg-white">
                <p className="text-xs font-semibold text-gray-900">No matches found for &quot;{query}&quot;</p>
                <p className="text-[11px] text-gray-400 mt-1">Try checking for typos or searching by scent note (e.g. Amber, Citrus, Oud)</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
