import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types/product';
import { toast } from 'react-hot-toast';
import { getBrandFromTags } from '@/lib/transformers';

interface CompareState {
  items: Product[];
  isOpen: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: number | string) => void;
  clearItems: () => void;
  openCompare: () => void;
  closeCompare: () => void;
  toggleCompare: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCompare: () => set({ isOpen: true }),
      closeCompare: () => set({ isOpen: false }),
      toggleCompare: () => set((state) => ({ isOpen: !state.isOpen })),

      addItem: (product) => {
        const { items } = get();
        if (items.length >= 4) {
          toast.error("You can compare up to 4 items.");
          return;
        }
        if (items.find((item) => item.id === product.id)) {
          return;
        }
        set({ items: [...items, product] });
        const brandName = getBrandFromTags(product.tags) || product.brand || "";
        toast.success(`Added ${brandName} - ${product.title} to comparison`);
      },

      removeItem: (productId) => {
        const { items } = get();
        const item = items.find((i) => String(i.id) === String(productId));
        if (item) {
          const brandName = getBrandFromTags(item.tags) || item.brand || "";
          toast.success(`Removed ${brandName} - ${item.title} from comparison`);
        }
        set((state) => ({
          items: state.items.filter((item) => String(item.id) !== String(productId)),
        }));
      },

      clearItems: () => {
        set({ items: [] });
        toast.success("Comparison list cleared.");
      },
    }),
    {
      name: 'perfumebooth-compare', // local storage key
    }
  )
);

