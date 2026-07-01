"use client";

import { useState, useEffect, useRef, useCallback, useMemo, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AnimatedChevronDown as ChevronDown } from "@/components/ui/icons/AnimatedChevronDown";
import { AnimatedChevronUp as ChevronUp } from "@/components/ui/icons/AnimatedChevronUp";
import { AnimatedStar as Star } from "@/components/ui/icons/AnimatedStar";
import { AnimatedTag as Tag } from "@/components/ui/icons/AnimatedTag";
import { AnimatedUsers as Users } from "@/components/ui/icons/AnimatedUsers";
import { AnimatedPackageCheck as PackageCheck } from "@/components/ui/icons/AnimatedPackageCheck";
import { AnimatedAward as Award } from "@/components/ui/icons/AnimatedAward";
import { AnimatedIndianRupee as IndianRupee } from "@/components/ui/icons/AnimatedIndianRupee";
import { AnimatedFilter as Filter } from "@/components/ui/icons/AnimatedFilter";
import { AnimatedSlidersHorizontal as SortIcon } from "@/components/ui/icons/AnimatedSlidersHorizontal";
import { Product } from "@/types/product";
import { FilterSection } from "./FilterSection";
import { CollectionContext, PageInfo } from "./useCollection";
import BackToTop from "@/components/ui/BackToTop";
import { TOP_BRANDS, SORT_OPTIONS } from "@/lib/constants";
import { useFilterLogic } from "./useFilterLogic";

interface FilterValue {
  id: string;
  label: string;
  count: number;
  input: string;
}



interface SideFilterProps {
  initialProducts: Product[];
  initialPageInfo: PageInfo;
  initialFilters: any[];
  initialTotalCount?: number;
  collectionHandle?: string;
  title?: string;
  description?: string;
  globalBrands?: string[];
  children?: React.ReactNode;
}

export default function SideFilter({
  initialProducts,
  initialPageInfo,
  initialFilters,
  initialTotalCount,
  collectionHandle,
  title,
  description,
  globalBrands,
  children,
}: SideFilterProps) {
  const {
    products,
    pageInfo,
    isLoadingMore,
    isFiltering,
    totalCount,
    sort,
    setSort,
    selectedTypes,
    selectedBrands,
    selectedAvailability,
    selectedGender,
    selectedRating,
    filters,
    priceRange,
    toggleType,
    toggleBrand,
    toggleAvailability,
    toggleGender,
    toggleRating,
    handlePriceChange,
    handleClearAll,
    handleLoadMore,
    applyFilters,
  } = useFilterLogic({
    initialProducts,
    initialPageInfo,
    initialFilters,
    initialTotalCount,
    collectionHandle,
    title,
  });

  const searchParams = useSearchParams();

  // Mobile drawer state
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileFilterTab, setMobileFilterTab] = useState<string>('gender');

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'sort': true,
    'type': false,
    'gender': false,
    'brand': false,
    'availability': false,
    'price': false,
    'rating': false,
    'other': false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Dynamic filter lists from Shopify
  const brandFilter = filters.find((f) => f.id.toLowerCase().includes("vendor") || f.label.toLowerCase() === "brand");
  const typeFilter = filters.find((f) => f.id.toLowerCase().includes("product_type") || f.label.toLowerCase().includes("type") || f.label.toLowerCase().includes("category"));
  const availabilityFilter = filters.find((f) => f.id.toLowerCase().includes("available") || f.label.toLowerCase().includes("availability"));

  const STANDARD_TYPES = [
    "Eau De Parfum",
    "Eau De Toilette"
  ];

  const STANDARD_GENDERS = ["Men", "Women", "Unisex"];

  const isBrandPage = collectionHandle ? TOP_BRANDS.some(b => {
    const slug = b.toLowerCase()
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug === collectionHandle;
  }) : false;

  const isTitleBrand = title ? TOP_BRANDS.some(b => title.toLowerCase().includes(b.toLowerCase())) : false;
  const shouldHideBrandFilter = isBrandPage || (isTitleBrand && collectionHandle !== 'all' && collectionHandle !== 'men' && collectionHandle !== 'women');

  const CATEGORY_HANDLES = ['deodorants', 'attars', 'mist', 'body-mists', 'perfumes', 'gift-sets', 'scent-shot'];
  const shouldHideTypeFilter = collectionHandle ? CATEGORY_HANDLES.includes(collectionHandle.toLowerCase()) : false;

  const availableBrands = Array.from(new Set([
    ...TOP_BRANDS,
    ...(globalBrands || []),
    ...(brandFilter?.values.map((v: any) => v.label) || [])
  ].filter((b): b is string => typeof b === 'string' && b.length > 0).map(b => b.trim())))
    .reduce((acc: string[], curr: string) => {
      if (!acc.find(item => item.toLowerCase() === curr.toLowerCase())) {
        acc.push(curr);
      }
      return acc;
    }, [])
    .sort();

  const availableTypes = Array.from(new Set([
    ...STANDARD_TYPES,
    ...(typeFilter?.values.map((v: any) => v.label) || [])
  ].filter((t): t is string => typeof t === 'string' && t.length > 0).map(t => t.trim())))
    .reduce((acc: string[], curr: string) => {
      if (!acc.find(item => item.toLowerCase() === curr.toLowerCase())) {
        acc.push(curr);
      }
      return acc;
    }, [])
    .sort()
    .filter((t: string) => {
      const lower = t.toLowerCase();
      // Filter out genders as they have their own section
      if (STANDARD_GENDERS.some(g => lower === g.toLowerCase())) return false;
      // Filter out redundant types if standard ones exist
      if (lower === "edp" && STANDARD_TYPES.includes("Eau De Parfum")) return false;
      if (lower === "edt" && STANDARD_TYPES.includes("Eau De Toilette")) return false;
      // Filter out forbidden product types (attars, deo, spray, mist, body spray/spary, perfume)
      const forbidden = ["attar", "deo", "spray", "mist", "spary", "perfume"];
      if (forbidden.some(word => lower.includes(word))) return false;
      return true;
    });

  // Helper for case-insensitive check
  const isTypeSelected = (typeLabel: string) => {
    return selectedTypes.some(t => t.toLowerCase() === typeLabel.toLowerCase());
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedBrands.length > 0 || selectedAvailability.length > 0 || selectedGender.length > 0 || selectedRating !== null || priceRange[0] > 0 || priceRange[1] < 10000;

  const contextValue = {
    products,
    isLoadingMore,
    isFiltering,
    pageInfo,
    handleLoadMore,
    title,
    sort,
    setSort,
    applyFilters,
    selectedTypes,
    selectedBrands,
    priceRange,
    selectedAvailability,
    selectedGender,
    selectedRating,
    totalCount
  };

  /* --- Side items (Sort/Filters) --- */
  return (
    <CollectionContext.Provider value={contextValue}>
      <main className="bg-[#fafafa] text-[#1a1410] font-sans selection:bg-[#b8924a]/20">


        <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

        <div className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row bg-[#fafafa]">
          {/* SIDEBAR - Independent Scroll (Split View) */}
          <aside className="hidden md:block w-[300px] lg:w-[350px] shrink-0 sticky top-24 self-start max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar px-6 lg:px-10 py-10">
            <h3 className="text-[20px] mb-6 uppercase tracking-[0.2em] text-[#807667] group-hover:text-[#b8924a] transition-colors">Filters</h3>
            <div className="space-y-8">
              <FilterSection
                title="Sort By"
                icon={<SortIcon size={12} className="text-[#807667] group-hover:text-[#b8924a] transition-colors" animateOn="hover" />}
                isExpanded={expandedSections.sort}
                onToggle={() => toggleSection('sort')}
              >
                <ul className="space-y-3">
                  {SORT_OPTIONS.map((option) => (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => {
                          setSort(option.value);
                          applyFilters(
                            selectedTypes,
                            selectedBrands,
                            priceRange,
                            selectedAvailability,
                            selectedGender,
                            selectedRating,
                            option.value
                          );
                        }}
                        className="w-full flex items-center gap-3 cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-[#b8924a] rounded-sm py-0.5"
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${sort === option.value ? "bg-[#b8924a] border-[#b8924a]" : "border-[#d1c5b3]"}`}>
                          {sort === option.value && <div className="w-1 h-1 bg-white rounded-full" />}
                        </div>
                        <span className={`text-[12px] transition-colors ${sort === option.value ? "text-[#b8924a] font-bold" : "text-[#4e4638] group-hover:text-[#b8924a]"}`}>
                          {option.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </FilterSection>

              {!shouldHideTypeFilter && availableTypes.length > 0 && (
                <FilterSection
                  title="Product Type"
                  icon={<Tag size={12} className="text-[#807667] group-hover:text-[#b8924a] transition-colors" animateOn="hover" />}
                  isExpanded={expandedSections.type}
                  onToggle={() => toggleSection('type')}
                >
                  <ul className="space-y-3">
                    {availableTypes.map((typeLabel: string) => {
                      const isActive = selectedTypes.some(t => t.toLowerCase() === (typeLabel?.toLowerCase() || ""));
                      return (
                        <li key={typeLabel}>
                          <button
                            type="button"
                            onClick={() => toggleType(typeLabel)}
                            className="w-full flex items-center gap-3 cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-[#b8924a] rounded-sm py-0.5"
                            suppressHydrationWarning
                          >
                            <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-[#b8924a] border-[#b8924a]" : "border-[#d1c5b3]"}`}>
                              {isActive && <div className="w-1.5 h-1.5 bg-white" />}
                            </div>
                            <span className="text-[12px] text-[#4e4638] flex-1">{typeLabel}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </FilterSection>
              )}

              {/* Gender Filter - Hardcoded for this store's tags */}
              {!['men', 'women', 'unisex', 'perfumes-for-men', 'perfumes-for-women', 'unisex-perfumes'].includes(collectionHandle?.toLowerCase() || '') && (
                <FilterSection
                  title="Gender"
                  icon={<Users size={12} className="text-[#807667] group-hover:text-[#b8924a] transition-colors" animateOn="hover" />}
                  isExpanded={expandedSections.gender}
                  onToggle={() => toggleSection('gender')}
                >
                  <ul className="space-y-3">
                    {STANDARD_GENDERS.map((genderLabel) => {
                      const isActive = selectedGender.some(g => g.toLowerCase() === genderLabel.toLowerCase());
                      return (
                        <li key={genderLabel}>
                          <button
                            type="button"
                            onClick={() => toggleGender(genderLabel)}
                            className="w-full flex items-center gap-3 cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-[#b8924a] rounded-sm py-0.5"
                            suppressHydrationWarning
                          >
                            <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-[#b8924a] border-[#b8924a]" : "border-[#d1c5b3]"}`}>
                              {isActive && <div className="w-1.5 h-1.5 bg-white" />}
                            </div>
                            <span className="text-[12px] text-[#4e4638] flex-1">{genderLabel}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </FilterSection>
              )}

              {/* 3. Customer Rating */}
              <FilterSection
                title="Customer Rating"
                icon={<Star size={12} className="text-[#807667] group-hover:text-[#b8924a] transition-colors" animateOn="hover" />}
                isExpanded={expandedSections.rating}
                onToggle={() => toggleSection('rating')}
              >
                <ul className="space-y-4">
                  {[4, 3, 2].map((starVal) => {
                    const isActive = selectedRating === starVal;
                    return (
                      <li key={starVal}>
                        <button
                          type="button"
                          onClick={() => toggleRating(starVal)}
                          className="w-full flex items-center gap-3 cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-[#b8924a] rounded-sm py-1"
                          suppressHydrationWarning
                        >
                          <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-[#b8924a] border-[#b8924a]" : "border-[#d1c5b3]"}`}>
                            {isActive && <div className="w-1.5 h-1.5 bg-white" />}
                          </div>
                          <div className="flex items-center gap-1 text-[var(--color-gold)]">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                size={12}
                                fill={i <= starVal ? "currentColor" : "none"}
                                strokeWidth={i <= starVal ? 0 : 2}
                              />
                            ))}
                            <span className="text-[11px] text-[#4e4638] ml-2 font-medium tracking-wide">& Up</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </FilterSection>

              {/* 4. Availability */}
              <FilterSection
                title="Availability"
                icon={<PackageCheck size={12} className="text-[#807667] group-hover:text-[#b8924a] transition-colors" animateOn="hover" />}
                isExpanded={expandedSections.availability}
                onToggle={() => toggleSection('availability')}
              >
                <ul className="space-y-3">
                  {["In stock", "Out of stock"].map((status) => {
                    const filterVal = availabilityFilter?.values.find((v: { label: string; }) => v.label.toLowerCase() === status.toLowerCase());
                    const count = filterVal?.count;
                    const isActive = selectedAvailability.includes(status);
                    return (
                      <li key={status}>
                        <button
                          type="button"
                          onClick={() => toggleAvailability(status)}
                          className="w-full flex items-center gap-3 cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-[#b8924a] rounded-sm py-0.5"
                          suppressHydrationWarning
                        >
                          <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-[#b8924a] border-[#b8924a]" : "border-[#d1c5b3]"}`}>
                            {isActive && <div className="w-1.5 h-1.5 bg-white" />}
                          </div>
                          <span className="text-[12px] text-[#4e4638] flex-1">{status}</span>
                          {count !== undefined && <span className="text-[10px] text-[#807667]">({count})</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </FilterSection>

              {filters.filter((f) => {
    const id = f.id.toLowerCase();
    const label = f.label.toLowerCase();
    return !id.includes("vendor") && label !== "brand" &&
           !id.includes("product_type") && !label.includes("type") && !label.includes("category") &&
           !id.includes("available") && !label.includes("availability") &&
           !id.includes("price") && !label.includes("price") &&
           !label.includes("gender") && !id.includes("gender");
  })
                .map((filter) => {
                  const sectionId = `other-${filter.id}`;
                  const isExpanded = expandedSections[sectionId] ?? false;
                  return (
                    <FilterSection
                      key={filter.id}
                      title={filter.label}
                      icon={<Filter size={12} className="text-[#807667] group-hover:text-[#b8924a] transition-colors" animateOn="hover" />}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedSections(prev => ({ ...prev, [sectionId]: !isExpanded }))}
                    >
                      <ul className="space-y-3">
                        {filter.values.map((v: FilterValue) => {
                          const isActive = searchParams.get(filter.label.toLowerCase())?.split(",").includes(v.label) ||
                            searchParams.get(filter.id)?.split(",").includes(v.label);
                          return (
                            <li key={v.label}>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = searchParams.get(filter.label.toLowerCase())?.split(",").filter(Boolean) || [];
                                  const next = current.includes(v.label) ? current.filter(x => x !== v.label) : [...current, v.label];

                                  // Construct current state to pass to applyFilters
                                  applyFilters(
                                    selectedTypes,
                                    selectedBrands,
                                    priceRange,
                                    selectedAvailability,
                                    selectedGender,
                                    selectedRating,
                                    sort,
                                    { [filter.label.toLowerCase()]: next }
                                  );
                                }}
                                className="w-full flex items-center gap-3 cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-[#b8924a] rounded-sm py-0.5"
                                suppressHydrationWarning
                              >
                                <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-[#b8924a] border-[#b8924a]" : "border-[#d1c5b3]"}`}>
                                  {isActive && <div className="w-1.5 h-1.5 bg-white" />}
                                </div>
                                <span className="text-[12px] text-[#4e4638] flex-1">{v.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </FilterSection>
                  );
                })}

              {!shouldHideBrandFilter && availableBrands.length > 0 && (
                <FilterSection
                  title="Brand"
                  icon={<Award size={12} className="text-[#807667] group-hover:text-[#b8924a] transition-colors" animateOn="hover" />}
                  isExpanded={expandedSections.brand}
                  onToggle={() => toggleSection('brand')}
                >
                  <ul className="space-y-3 pr-2 custom-scrollbar overflow-y-auto max-h-[400px]">
                    {availableBrands.map((brandLabel: string) => {
                      const isActive = selectedBrands.some(b => b.toLowerCase() === (brandLabel?.toLowerCase() || ""));
                      return (
                        <li key={brandLabel}>
                          <button
                            type="button"
                            onClick={() => toggleBrand(brandLabel)}
                            className="w-full flex items-center gap-3 cursor-pointer group text-left outline-none focus-visible:ring-1 focus-visible:ring-[#b8924a] rounded-sm py-0.5"
                            suppressHydrationWarning
                          >
                            <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-[#b8924a] border-[#b8924a]" : "border-[#d1c5b3]"}`}>
                              {isActive && <div className="w-1.5 h-1.5 bg-white" />}
                            </div>
                            <span className="text-[12px] text-[#4e4638] flex-1">{brandLabel}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </FilterSection>
              )}

              <FilterSection
                title="Price Range"
                icon={<IndianRupee size={12} className="text-[#807667] group-hover:text-[#b8924a] transition-colors" animateOn="hover" />}
                isExpanded={expandedSections.price}
                onToggle={() => toggleSection('price')}
              >
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="500"
                  value={priceRange[1]}
                  onChange={(e) => handlePriceChange(priceRange[0], parseInt(e.target.value))}
                  className="w-full h-1 bg-[#d1c5b3] rounded-lg appearance-none cursor-pointer accent-[#b8924a]"
                />
                <p className="text-[11px] mt-3 text-[#1a1410] font-medium tracking-wide">Under ₹{priceRange[1].toLocaleString()}</p>
              </FilterSection>

              {/* Reset Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="w-full mt-4 py-3 text-[9px] font-bold uppercase tracking-[0.25em] bg-white border border-[#b8924a] text-[#b8924a] hover:bg-[#b8924a] hover:text-white transition-all duration-500 shadow-sm"
                  suppressHydrationWarning
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </aside>

          {/* MAIN CONTENT AREA - Independent Scroll */}
          <div className="flex-1 min-w-0 px-4 md:px-8 py-4 pb-20 md:pb-4">
            {Array.isArray(children)
              ? children.filter(child => (child as any)?.type?.name !== 'Breadcrumb' && !(child as any)?.props?.items)
              : children
            }
          </div>
        </div>

        {/* ========== MOBILE: Sticky Bottom Bar ========== */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-[#d1c5b3]/50 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          {/* Sort Button */}
          <button
            type="button"
            onClick={() => { setMobileSortOpen(true); setMobileFilterOpen(false); }}
            className="flex-1 flex items-center justify-center gap-2 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-[#4e4638] border-r border-[#d1c5b3]/50 hover:bg-[#faf7f2] active:bg-[#f0ebe1] transition-colors"
            suppressHydrationWarning
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>
            Sort
          </button>
          {/* Filter Button */}
          <button
            type="button"
            onClick={() => { setMobileFilterOpen(true); setMobileSortOpen(false); }}
            className="flex-1 flex items-center justify-center gap-2 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-[#4e4638] hover:bg-[#faf7f2] active:bg-[#f0ebe1] transition-colors relative"
            suppressHydrationWarning
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            Filter
            {hasActiveFilters && (
              <span className="absolute top-2.5 right-8 w-2 h-2 rounded-full bg-[#b8924a]" />
            )}
          </button>
        </div>

        {/* ========== MOBILE: Sort Bottom Sheet ========== */}
        {mobileSortOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setMobileSortOpen(false)} />
            {/* Sheet */}
            <div className="relative bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[75vh] overflow-y-auto">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[#d1c5b3]" />
              </div>
              <div className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-[#f0ebe1]">
                <h3 className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#1a1410]">Sort By</h3>
                <button type="button" onClick={() => setMobileSortOpen(false)} className="text-[#807667] text-xl leading-none" suppressHydrationWarning>×</button>
              </div>
              <ul className="px-5 py-4 space-y-0 divide-y divide-[#f0ebe1]">
                {[
                  { label: 'Featured', value: 'featured' },
                  { label: 'Newest First', value: 'newest' },
                  { label: 'Price: Low to High', value: 'price-asc' },
                  { label: 'Price: High to Low', value: 'price-desc' },
                  { label: 'Trending', value: 'trending' }
                ].map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => {
                        setSort(option.value);
                        applyFilters(selectedTypes, selectedBrands, priceRange, selectedAvailability, selectedGender, selectedRating, option.value);
                        setMobileSortOpen(false);
                      }}
                      className="w-full flex items-center justify-between py-4"
                      suppressHydrationWarning
                    >
                      <span className={`text-[13px] tracking-wide ${sort === option.value ? 'text-[#b8924a] font-bold' : 'text-[#4e4638]'}`}>{option.label}</span>
                      {sort === option.value && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8924a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ========== MOBILE: Filter Bottom Sheet ========== */}
        {mobileFilterOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setMobileFilterOpen(false)} />
            {/* Sheet — two-panel layout (left tabs + right options) */}
            <div className="relative bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300" style={{ maxHeight: '85vh' }}>
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[#d1c5b3]" />
              </div>
              {/* Header */}
              <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-[#f0ebe1]">
                <h3 className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#1a1410]">Filters</h3>
                <div className="flex items-center gap-4">
                  {hasActiveFilters && (
                    <button type="button" onClick={handleClearAll} className="text-[10px] uppercase tracking-wider text-[#b8924a] font-bold" suppressHydrationWarning>Clear All</button>
                  )}
                  <button type="button" onClick={() => setMobileFilterOpen(false)} className="text-[#807667] text-xl leading-none" suppressHydrationWarning>×</button>
                </div>
              </div>
              {/* Two-panel body */}
              <div className="flex" style={{ height: 'calc(85vh - 100px)' }}>
                {/* Left: Category tabs */}
                <div className="w-[120px] shrink-0 border-r border-[#f0ebe1] overflow-y-auto bg-[#faf7f2]">
                  {[
                    { id: 'gender', label: 'Gender', active: selectedGender.length > 0 },
                    { id: 'type', label: 'Type', active: selectedTypes.length > 0, hide: shouldHideTypeFilter },
                    { id: 'brand', label: 'Brand', active: selectedBrands.length > 0, hide: shouldHideBrandFilter },
                    { id: 'price', label: 'Price', active: priceRange[0] > 0 || priceRange[1] < 10000 },
                    { id: 'rating', label: 'Rating', active: selectedRating !== null },
                    { id: 'availability', label: 'Availability', active: selectedAvailability.length > 0 },
                  ].filter(t => !t.hide).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMobileFilterTab(tab.id)}
                      className={`w-full text-left px-3 py-4 text-[10px] uppercase tracking-[0.15em] font-bold border-l-2 transition-all relative ${mobileFilterTab === tab.id
                          ? 'border-[#b8924a] bg-white text-[#b8924a]'
                          : 'border-transparent text-[#807667]'
                        }`}
                      suppressHydrationWarning
                    >
                      {tab.label}
                      {tab.active && <span className="absolute top-3 right-2 w-1.5 h-1.5 rounded-full bg-[#b8924a]" />}
                    </button>
                  ))}
                </div>

                {/* Right: Filter options */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

                  {/* Gender */}
                  {mobileFilterTab === 'gender' && (
                    <>
                      {STANDARD_GENDERS.map(genderLabel => {
                        const isActive = selectedGender.some(g => g.toLowerCase() === genderLabel.toLowerCase());
                        return (
                          <button
                            key={genderLabel}
                            type="button"
                            onClick={() => toggleGender(genderLabel)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-[12px] font-medium transition-all ${isActive ? 'border-[#b8924a] bg-[#b8924a]/8 text-[#b8924a] font-bold' : 'border-[#e8e0d5] text-[#4e4638]'
                              }`}
                            suppressHydrationWarning
                          >
                            <span>{genderLabel}</span>
                            {isActive && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b8924a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Type */}
                  {mobileFilterTab === 'type' && (
                    <>
                      {[...new Set(availableTypes.map(t => t.toLowerCase()))].map(typeLabel => {
                        const originalLabel = availableTypes.find(t => t.toLowerCase() === typeLabel) || typeLabel;
                        const isActive = selectedTypes.some(t => t.toLowerCase() === typeLabel);
                        return (
                          <button
                            key={typeLabel}
                            type="button"
                            onClick={() => toggleType(originalLabel)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-[12px] font-medium transition-all ${isActive ? 'border-[#b8924a] bg-[#b8924a]/8 text-[#b8924a] font-bold' : 'border-[#e8e0d5] text-[#4e4638]'}`}
                            suppressHydrationWarning
                          >
                            <span>{originalLabel}</span>
                            {isActive && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b8924a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Brand */}
                  {mobileFilterTab === 'brand' && (
                    <>
                      {availableBrands.map(brandLabel => {
                        const isActive = selectedBrands.some(b => b.toLowerCase() === brandLabel.toLowerCase());
                        return (
                          <button
                            key={brandLabel}
                            type="button"
                            onClick={() => toggleBrand(brandLabel)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-[12px] font-medium transition-all ${isActive ? 'border-[#b8924a] bg-[#b8924a]/8 text-[#b8924a] font-bold' : 'border-[#e8e0d5] text-[#4e4638]'
                              }`}
                            suppressHydrationWarning
                          >
                            <span>{brandLabel}</span>
                            {isActive && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b8924a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Price */}
                  {mobileFilterTab === 'price' && (
                    <div className="px-1 py-2 space-y-4">
                      <div className="flex justify-between text-[11px] text-[#807667] font-medium">
                        <span>₹0</span>
                        <span>₹10,000</span>
                      </div>
                      <input
                        type="range" min="0" max="10000" step="500"
                        value={priceRange[1]}
                        onChange={(e) => handlePriceChange(priceRange[0], parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[#d1c5b3] rounded-lg appearance-none cursor-pointer accent-[#b8924a]"
                      />
                      <p className="text-[13px] font-bold text-[#1a1410] text-center">Under ₹{priceRange[1].toLocaleString()}</p>
                      {/* Quick price chips */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {[500, 1000, 2000, 5000].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handlePriceChange(0, val)}
                            className={`py-2 rounded-lg border text-[11px] font-bold transition-all ${priceRange[1] === val ? 'border-[#b8924a] bg-[#b8924a]/8 text-[#b8924a]' : 'border-[#e8e0d5] text-[#4e4638]'
                              }`}
                            suppressHydrationWarning
                          >
                            Under ₹{val.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rating */}
                  {mobileFilterTab === 'rating' && (
                    <>
                      {[4, 3, 2].map(starVal => {
                        const isActive = selectedRating === starVal;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => toggleRating(starVal)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-[12px] transition-all ${isActive ? 'border-[#b8924a] bg-[#b8924a]/8' : 'border-[#e8e0d5]'
                              }`}
                            suppressHydrationWarning
                          >
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <svg key={i} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={i <= starVal ? '#b8924a' : 'none'} stroke="#b8924a" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                              ))}
                            </div>
                            <span className={`font-medium ${isActive ? 'text-[#b8924a] font-bold' : 'text-[#4e4638]'}`}>& Up</span>
                            {isActive && <svg className="ml-auto" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b8924a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Availability */}
                  {mobileFilterTab === 'availability' && (
                    <>
                      {['In stock', 'Out of stock'].map(status => {
                        const isActive = selectedAvailability.some(s => s.toLowerCase() === status.toLowerCase());
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => toggleAvailability(status)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-[12px] font-medium transition-all ${isActive ? 'border-[#b8924a] bg-[#b8924a]/8 text-[#b8924a] font-bold' : 'border-[#e8e0d5] text-[#4e4638]'
                              }`}
                            suppressHydrationWarning
                          >
                            <span>{status}</span>
                            {isActive && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b8924a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </button>
                        );
                      })}
                    </>
                  )}

                </div>
              </div>
              {/* Footer CTA */}
              <div className="px-5 py-3 border-t border-[#f0ebe1] bg-white">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full py-3.5 bg-[#1a1410] text-white text-[10px] uppercase tracking-[0.25em] font-bold rounded-lg"
                  suppressHydrationWarning
                >
                  View {totalCount} Products
                </button>
              </div>
            </div>
          </div>
        )}

        <BackToTop />
      </main>
    </CollectionContext.Provider>
  );
}
