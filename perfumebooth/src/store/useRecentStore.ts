import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/app/products/[slug]/page';
import { safeStorage } from '@/lib/storage';

interface RecentState {
  recentItems: Product[];
  addRecent: (product: Product) => void;
  clearRecents: () => void;
}

export const useRecentStore = create<RecentState>()(
  persist(
    (set, get) => ({
      recentItems: [],

      addRecent: (product: Product) => {
        set((state) => {
          // Check if it already exists to prevent duplicates
          const exists = state.recentItems.some((item) => item.id === product.id);
          
          let newItems = state.recentItems;
          if (exists) {
            // Move it to the front of the list
            newItems = [
              product,
              ...state.recentItems.filter((item) => item.id !== product.id),
            ];
          } else {
            // Add new item to the front
            newItems = [product, ...state.recentItems];
          }

          // Keep only the 10 most recent products to avoid bloating localStorage
          return { recentItems: newItems.slice(0, 10) };
        });
      },

      clearRecents: () => set({ recentItems: [] }),
    }),
    {
      name: 'perfumebooth-recents', // localStorage key
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
