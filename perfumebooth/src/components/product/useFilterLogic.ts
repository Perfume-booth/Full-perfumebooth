"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Product } from "@/types/product";
import { PageInfo } from "./useCollection";
import { loadMoreCollectionProducts } from "@/lib/actions/actions";
import { getCollectionProducts } from "@/lib/catalog";
import { buildCatalogFilters, getSortConfig } from "@/lib/catalog-filters";
import { SORT_OPTIONS, TOP_BRANDS } from "@/lib/constants";

interface UseFilterLogicProps {
  initialProducts: Product[];
  initialPageInfo: PageInfo;
  initialFilters: any[];
  initialTotalCount?: number;
  collectionHandle?: string;
  title?: string;
}

export const useFilterLogic = ({
  initialProducts,
  initialPageInfo,
  initialFilters,
  initialTotalCount,
  collectionHandle,
  title,
}: UseFilterLogicProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter & Sorting state
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(initialTotalCount || initialProducts.length);
  const [isFiltering, setIsFiltering] = useState(false);

  const getProductRating = (product: Product) => {
    const prodIdString = product.id?.toString() || "";
    const seed = prodIdString.charCodeAt(prodIdString.length - 1) || 0;
    return product.rating || (3.5 + (seed % 3) * 0.5);
  };

  const sortProductsByAvailability = (productList: Product[], currentSortKey?: string) => {
    if (currentSortKey && 
        currentSortKey !== 'featured' && 
        currentSortKey !== 'trending' && 
        currentSortKey !== SORT_OPTIONS[0].value) {
      return productList;
    }

    return [...productList].sort((a, b) => {
      const aStock = a.availableForSale !== false && (a as any).stock_count !== 0;
      const bStock = b.availableForSale !== false && (b as any).stock_count !== 0;
      if (aStock === bStock) return 0;
      return aStock ? -1 : 1;
    });
  };

  const [products, setProducts] = useState(() => sortProductsByAvailability(initialProducts));
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isFirstMount = useRef(true);
  const priceDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (priceDebounceTimer.current) {
        clearTimeout(priceDebounceTimer.current);
      }
    };
  }, []);

  // Sync state with URL params and server-rendered props
  useEffect(() => {
    const types = searchParams.get("type")?.split(",").filter(Boolean) || [];
    const brands = searchParams.get("brand")?.split(",").filter(Boolean) || [];
    const availability = searchParams.get("availability")?.split(",").filter(Boolean) || [];
    const gender = searchParams.get("gender")?.split(",").filter(Boolean) || [];
    const rating = searchParams.get("rating") ? parseFloat(searchParams.get("rating")!) : null;
    const minPrice = parseInt(searchParams.get("min") || "0");
    const maxPrice = parseInt(searchParams.get("max") || "10000");
    const sortVal = searchParams.get("sort") || SORT_OPTIONS[0].value;

    const initialGender = [...gender];
    if (gender.length === 0 && isFirstMount.current && collectionHandle) {
      const handleLower = collectionHandle.toLowerCase();
      if (handleLower.includes("men") || handleLower.includes("him")) initialGender.push("Men");
      else if (handleLower.includes("women") || handleLower.includes("her")) initialGender.push("Women");
    }

    const q = searchParams.get("q") || "";
    
    setSelectedTypes(types);
    setSelectedBrands(brands);
    setSelectedAvailability(availability);
    setSelectedGender(initialGender);
    setSelectedRating(rating);
    setPriceRange([minPrice, maxPrice]);
    setSort(sortVal);
    setSearchQuery(q);

    // Sync products and metadata from SSR props when navigating or params change
    setProducts(sortProductsByAvailability(initialProducts, sortVal));
    setPageInfo(initialPageInfo);
    setFilters(initialFilters);
    setTotalCount(initialTotalCount || initialProducts.length);

    isFirstMount.current = false;
  }, [searchParams, collectionHandle, initialProducts, initialPageInfo, initialFilters, initialTotalCount]);

  const applyFilters = async (
    types: string[],
    brands: string[],
    price: [number, number],
    availability: string[],
    gender: string[],
    rating: number | null = selectedRating,
    currentSort: string = sort,
    extraFilters: Record<string, string[]> = {}
  ) => {
    setIsFiltering(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (types.length > 0) params.set("type", types.join(","));
    else params.delete("type");

    if (brands.length > 0) params.set("brand", brands.join(","));
    else params.delete("brand");

    if (availability.length > 0) params.set("availability", availability.join(","));
    else params.delete("availability");

    if (gender.length > 0) params.set("gender", gender.join(","));
    else params.delete("gender");

    if (rating !== null) params.set("rating", rating.toString());
    else params.delete("rating");

    if (price[0] > 0 || price[1] < 10000) {
      params.set("min", price[0].toString());
      params.set("max", price[1].toString());
    } else {
      params.delete("min");
      params.delete("max");
    }

    if (currentSort !== SORT_OPTIONS[0].value) params.set("sort", currentSort);
    else params.delete("sort");

    // Add extra filters (e.g. Concentration, Format)
    Object.entries(extraFilters).forEach(([key, values]) => {
      if (values && values.length > 0) {
        params.set(key, values.join(","));
      } else {
        params.delete(key);
      }
    });

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    // Build filter options for API
    const filterOptions = buildCatalogFilters({
      types,
      brands,
      price,
      availability,
      gender,
      initialFilters: filters,
      extraFilters
    });

    if (searchQuery) (filterOptions as any).push({ q: searchQuery });

    const { sortKey, reverse } = getSortConfig(currentSort);

    try {
      const data = await getCollectionProducts(collectionHandle || 'all', 80, null as any, filterOptions, sortKey, reverse);
      if (data) {
        let finalProducts = data.products as Product[];
        if (rating !== null) {
          finalProducts = finalProducts.filter(p => getProductRating(p) >= rating);
        }
        setProducts(sortProductsByAvailability(finalProducts, currentSort));
        setPageInfo(data.pageInfo);
        setTotalCount(data.totalCount !== undefined ? data.totalCount : finalProducts.length);
        if (data.filters && data.filters.length > 0) {
          setFilters(data.filters);
        }
      }
    } catch (err) {
      console.error("Filtering error:", err);
    } finally {
      setIsFiltering(false);
    }
  };

  const handleLoadMore = useCallback(async () => {
    if (!pageInfo.hasNextPage || !pageInfo.endCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    const filterOptions = buildCatalogFilters({
      types: selectedTypes,
      brands: selectedBrands,
      price: priceRange,
      availability: selectedAvailability,
      gender: selectedGender,
      initialFilters: filters
    });

    const { sortKey, reverse } = getSortConfig(sort);
    try {
      const data = await loadMoreCollectionProducts(collectionHandle || 'all', pageInfo.endCursor, filterOptions, sortKey, reverse);

      if (data) {
        let nextProducts = (data as any).products as Product[];
        if (selectedRating !== null) {
          nextProducts = nextProducts.filter(p => getProductRating(p) >= selectedRating);
        }
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNext = nextProducts.filter(p => !existingIds.has(p.id));

          const available = prev.filter(p => p.availableForSale !== false && (p as any).stock_count !== 0);
          const outOfStock = prev.filter(p => p.availableForSale === false || (p as any).stock_count === 0);

          const nextAvailable = uniqueNext.filter(p => p.availableForSale !== false && (p as any).stock_count !== 0);
          const nextOutOfStock = uniqueNext.filter(p => p.availableForSale === false || (p as any).stock_count === 0);

          return [...available, ...nextAvailable, ...outOfStock, ...nextOutOfStock];
        });
        setPageInfo((data as any).pageInfo);
        if ((data as any).filters && (data as any).filters.length > 0) {
          setFilters((data as any).filters);
        }
      }
    } catch (error) {
      console.error("Error in handleLoadMore:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [pageInfo, isLoadingMore, selectedTypes, selectedBrands, priceRange, selectedAvailability, selectedGender, collectionHandle, sort, selectedRating, filters]);

  const toggleType = (type: string) => {
    const isSelected = selectedTypes.some(t => t.toLowerCase() === type.toLowerCase());
    const next = isSelected 
      ? selectedTypes.filter(t => t.toLowerCase() !== type.toLowerCase()) 
      : [...selectedTypes, type];
    setSelectedTypes(next);
    applyFilters(next, selectedBrands, priceRange, selectedAvailability, selectedGender);
  };

  const toggleBrand = (brand: string) => {
    const isSelected = selectedBrands.some(b => b.toLowerCase() === brand.toLowerCase());
    const next = isSelected 
      ? selectedBrands.filter(b => b.toLowerCase() !== brand.toLowerCase()) 
      : [...selectedBrands, brand];
    setSelectedBrands(next);
    applyFilters(selectedTypes, next, priceRange, selectedAvailability, selectedGender);
  };

  const toggleAvailability = (status: string) => {
    const isSelected = selectedAvailability.some(s => s.toLowerCase() === status.toLowerCase());
    const next = isSelected 
      ? selectedAvailability.filter(s => s.toLowerCase() !== status.toLowerCase()) 
      : [...selectedAvailability, status];
    setSelectedAvailability(next);
    applyFilters(selectedTypes, selectedBrands, priceRange, next, selectedGender);
  };

  const toggleGender = (gender: string) => {
    const isSelected = selectedGender.some(g => g.toLowerCase() === gender.toLowerCase());
    const next = isSelected 
      ? selectedGender.filter(g => g.toLowerCase() !== gender.toLowerCase()) 
      : [...selectedGender, gender];
    setSelectedGender(next);
    applyFilters(selectedTypes, selectedBrands, priceRange, selectedAvailability, next);
  };

  const toggleRating = (rating: number) => {
    const next = selectedRating === rating ? null : rating;
    setSelectedRating(next);
    applyFilters(selectedTypes, selectedBrands, priceRange, selectedAvailability, selectedGender, next);
  };

  const handlePriceChange = (min: number, max: number) => {
    setPriceRange([min, max]);
    if (priceDebounceTimer.current) clearTimeout(priceDebounceTimer.current);
    priceDebounceTimer.current = setTimeout(() => {
      applyFilters(selectedTypes, selectedBrands, [min, max], selectedAvailability, selectedGender);
    }, 300);
  };

  const handleClearAll = () => {
    setSelectedTypes([]);
    setSelectedBrands([]);
    setSelectedAvailability([]);
    setSelectedGender([]);
    setSelectedRating(null);
    applyFilters([], [], [0, 10000], [], [], null);
  };

  return {
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
  };
};
