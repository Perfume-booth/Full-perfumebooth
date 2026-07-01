"use client";

import { createContext, useContext } from "react";
import { Product } from "@/types/product";

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface CollectionContextType {
  products: Product[];
  isLoadingMore: boolean;
  isFiltering: boolean;
  pageInfo: PageInfo;
  handleLoadMore: () => Promise<void>;
  title?: string;
  sort: string;
  setSort: (sort: string) => void;
  applyFilters: any;
  selectedTypes: string[];
  selectedBrands: string[];
  priceRange: [number, number];
  selectedAvailability: string[];
  selectedGender: string[];
  selectedRating: number | null;
  totalCount: number;
}

export const CollectionContext = createContext<CollectionContextType | null>(null);

export const useCollection = () => {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error("useCollection must be used within a CollectionProvider (SideFilter)");
  }
  return context;
};
