import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

export interface WishlistItem {
  id: string;
  handle: string;
  title: string;
  image: string;
  price: string;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  syncToBackend: () => Promise<void>;
  fetchFromBackend: () => Promise<void>;
  clearWishlist: () => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        const state = get();
        const exists = state.items.some((i) => i.id === item.id);
        if (exists) return;
        
        set({ items: [...state.items, item] });
        get().syncToBackend();
      },
      
      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        get().syncToBackend();
      },
      
      isInWishlist: (id) => get().items.some((i) => i.id === id),

      syncToBackend: async () => {
        const isLoggedIn = Cookies.get('isLoggedIn') === 'true';
        if (!isLoggedIn) return;

        try {
          await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              items: get().items 
            })
          });
        } catch (error) {
          console.error('Wishlist sync failed:', error);
        }
      },

      fetchFromBackend: async () => {
        const isLoggedIn = Cookies.get('isLoggedIn') === 'true';
        if (!isLoggedIn) return;

        try {
          const res = await fetch('/api/wishlist');
          const data = await res.json();
          if (data.items) {
            const localItems = get().items;
            const backendItems = data.items as WishlistItem[];
            
            // Merge logic: Start with backend items, add local guest items if not already present
            const mergedItems = [...backendItems];
            let hasNewItems = false;

            localItems.forEach(localItem => {
              const exists = mergedItems.some(bi => bi.id === localItem.id);
              if (!exists) {
                mergedItems.push(localItem);
                hasNewItems = true;
              }
            });

            set({ items: mergedItems });

            // If we found guest items that weren't in the cloud, sync the merged list back immediately
            if (hasNewItems) {
              await get().syncToBackend();
            }
          }
        } catch (error) {
          console.error('Wishlist fetch failed:', error);
        }
      },

      clearWishlist: () => set({ items: [] }),
    }),
    { 
      name: 'perfumebooth-wishlist',
      // Ensure sync only happens on client side
    }
  )
);