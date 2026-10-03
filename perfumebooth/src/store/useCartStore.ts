import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "react-hot-toast";
export interface CartItem {
  [key: string]: any;
  id: string | number;
  title: string;
  price: string;
  cartQuantity: number;
  selectedVariantTitle?: string;
  selectedVariantId?: string;
  handle: string;
  requiresShipping?: boolean;
}

export interface ShippingRate { handle: string; title: string; amount: number; }

interface CartValidation {
  is_valid: boolean;
  has_stock_alerts: boolean;
  items: Array<{ product_id: string; variant_id?: string; current_price: string; available_stock: number; status: string }>;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number;
  discountAmount: number;
  discountErrorMessage: string | null;
  isApplyingDiscount: boolean;
  orderNotes: string;
  isCheckingOut: boolean;
  subtotalAmount: number;
  totalAmount: number;
  totalQuantity: number;
  availableShippingRates: ShippingRate[];
  selectedShippingRate: ShippingRate | null;
  buyNowItem: CartItem | null;
  buyNowDiscountAmount: number;
  buyNowCouponDiscount: number;
  buyNowCouponCode: string;
  addToCart: (product: any, quantity: number) => Promise<void>;
  removeFromCart: (productId: number | string, variantId?: string) => Promise<void>;
  updateQuantity: (productId: number | string, quantity: number, variantId?: string) => Promise<void>;
  clearCart: () => void;
  setCheckingOut: (status: boolean) => void;
  buyNow: (product: any, quantity: number) => Promise<void>;
  clearBuyNow: () => void;
  updateBuyNowQuantity: (quantity: number) => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  applyCoupon: (code: string, providedDiscount?: number) => Promise<boolean>;
  setOrderNotes: (notes: string) => void;
  setShippingRates: (rates: ShippingRate[]) => void;
  setSelectedShippingRate: (rate: ShippingRate | null) => void;
  validateCartStock: () => Promise<CartValidation>;
  totalItems: () => number;
  cartTotal: () => number;
  finalTotalAmount: () => number;
}

function getVariant(product: any) {
  const selectedId = product.selectedVariantId;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants.find((variant: any) => variant.id === selectedId) || variants[0];
}

function itemPrice(item: CartItem): number {
  const product = item as CartItem & { price?: string | number };
  const value = product.price ?? item.priceRange?.minVariantPrice?.amount ?? 0;
  const price = Number(value);
  return Number.isFinite(price) ? price : 0;
}

function recalculate(items: CartItem[]) {
  const subtotalAmount = items.reduce((total, item) => total + itemPrice(item) * item.cartQuantity, 0);
  return {
    subtotalAmount,
    totalAmount: subtotalAmount,
    totalQuantity: items.reduce((total, item) => total + item.cartQuantity, 0),
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [], isOpen: false, couponCode: "", couponDiscount: 0, discountAmount: 0,
      discountErrorMessage: null, isApplyingDiscount: false, orderNotes: "", isCheckingOut: false,
      subtotalAmount: 0, totalAmount: 0, totalQuantity: 0, availableShippingRates: [], selectedShippingRate: null,
      buyNowItem: null, buyNowDiscountAmount: 0, buyNowCouponDiscount: 0, buyNowCouponCode: "",

      addToCart: async (product, quantity) => {
        const variant = getVariant(product);
        const variantId = variant?.id || product.selectedVariantId;
        const maxStock = Number((variant as typeof variant & { quantityAvailable?: number })?.quantityAvailable ?? product.stock_count ?? 50);
        const safeQuantity = Math.max(1, Math.min(quantity, maxStock));
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => String(item.id) === String(product.id) && item.selectedVariantId === variantId,
          );
          const items = [...state.items];
          if (existingIndex >= 0) {
            const existing = items[existingIndex];
            items[existingIndex] = { ...existing, cartQuantity: Math.min(existing.cartQuantity + safeQuantity, maxStock) };
          } else {
            items.push({
              ...product,
              price: String(variant?.price || product.price || product.priceRange?.minVariantPrice?.amount || "0"),
              cartQuantity: safeQuantity,
              selectedVariantId: variantId,
              selectedVariantTitle: variant?.title,
              requiresShipping: (variant as typeof variant & { requiresShipping?: boolean })?.requiresShipping !== false,
            } as CartItem);
          }
          return { items, ...recalculate(items) };
        });
        toast.success(`Added "${product.title}" to cart`);
      },

      removeFromCart: async (productId, variantId) => {
        set((state) => {
          const items = state.items.filter(
            (item) => !(String(item.id) === String(productId) && (!variantId || item.selectedVariantId === variantId)),
          );
          return { items, ...recalculate(items) };
        });
      },

      updateQuantity: async (productId, quantity, variantId) => {
        set((state) => {
          const items = state.items.map((item) => {
            const matches = String(item.id) === String(productId) && (!variantId || item.selectedVariantId === variantId);
            if (!matches) return item;
            const maxStock = Number(item.stock_count || 50);
            return { ...item, cartQuantity: Math.max(1, Math.min(quantity, maxStock)) };
          });
          return { items, ...recalculate(items) };
        });
      },

      clearCart: () => set({
        items: [], couponCode: "", couponDiscount: 0, discountAmount: 0,
        subtotalAmount: 0, totalAmount: 0, totalQuantity: 0,
        availableShippingRates: [], selectedShippingRate: null,
      }),
      setCheckingOut: (isCheckingOut) => set({ isCheckingOut }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      buyNow: async (product, quantity) => {
        const variant = getVariant(product);
        const maxStock = Number((variant as typeof variant & { quantityAvailable?: number })?.quantityAvailable ?? product.stock_count ?? 50);
        set({
          buyNowItem: {
            ...product,
            price: String(variant?.price || product.price || product.priceRange?.minVariantPrice?.amount || "0"),
            cartQuantity: Math.max(1, Math.min(quantity, maxStock)),
            selectedVariantId: variant?.id,
            selectedVariantTitle: variant?.title,
            requiresShipping: (variant as typeof variant & { requiresShipping?: boolean })?.requiresShipping !== false,
          } as CartItem,
          buyNowDiscountAmount: 0, buyNowCouponDiscount: 0, buyNowCouponCode: "",
        });
      },
      clearBuyNow: () => set({ buyNowItem: null, buyNowDiscountAmount: 0, buyNowCouponDiscount: 0, buyNowCouponCode: "" }),
      updateBuyNowQuantity: async (quantity) => {
        set((state) => {
          if (!state.buyNowItem) return state;
          const maxStock = Number(state.buyNowItem.stock_count || 50);
          return { buyNowItem: { ...state.buyNowItem, cartQuantity: Math.max(1, Math.min(quantity, maxStock)) } };
        });
      },

      applyCoupon: async (code) => {
        const normalizedCode = code.trim().toUpperCase();
        if (!normalizedCode) {
          set({ couponCode: "", couponDiscount: 0, discountAmount: 0, discountErrorMessage: null });
          return true;
        }
        set({ isApplyingDiscount: true, discountErrorMessage: null });
        try {
          const buyNowItem = get().buyNowItem;
          const subtotal = buyNowItem ? itemPrice(buyNowItem) * buyNowItem.cartQuantity : get().cartTotal();
          const response = await fetch("/api/cart/coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: normalizedCode, subtotal }),
          });
          const result = await response.json();
          if (!response.ok || !result.valid) {
            set({ isApplyingDiscount: false, discountErrorMessage: result.message || "Invalid coupon code" });
            return false;
          }
          if (buyNowItem) {
            set({
              buyNowCouponCode: normalizedCode,
              buyNowCouponDiscount: Number(result.discount_percent || 0),
              buyNowDiscountAmount: Number(result.discount_amount || 0),
              isApplyingDiscount: false,
            });
          } else {
            set({
              couponCode: normalizedCode,
              couponDiscount: Number(result.discount_percent || 0),
              discountAmount: Number(result.discount_amount || 0),
              isApplyingDiscount: false,
            });
          }
          return true;
        } catch {
          set({ isApplyingDiscount: false, discountErrorMessage: "Unable to validate the coupon" });
          return false;
        }
      },

      setOrderNotes: (orderNotes) => set({ orderNotes }),
      setShippingRates: (availableShippingRates) => set({ availableShippingRates }),
      setSelectedShippingRate: (selectedShippingRate) => set({ selectedShippingRate }),
      validateCartStock: async () => {
        const items = get().items.map((item) => ({
          product_id: item.id, variant_id: item.selectedVariantId || null,
          quantity: item.cartQuantity, price: itemPrice(item),
        }));
        try {
          const response = await fetch("/api/cart/validate", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }),
          });
          return await response.json();
        } catch {
          return { is_valid: false, has_stock_alerts: true, items: [] };
        }
      },
      totalItems: () => get().items.reduce((total, item) => total + item.cartQuantity, 0),
      cartTotal: () => get().items.reduce((total, item) => total + itemPrice(item) * item.cartQuantity, 0),
      finalTotalAmount: () => {
        const state = get();
        const subtotal = state.cartTotal();
        const shipping = state.items.some((item) => item.requiresShipping !== false)
          ? (subtotal >= 999 ? 0 : state.selectedShippingRate?.amount ?? 119) : 0;
        return Math.max(0, subtotal - state.discountAmount + shipping);
      },
    }),
    {
      name: "perfumebooth-cart-v2",
      partialize: (state) => ({
        items: state.items, couponCode: state.couponCode, couponDiscount: state.couponDiscount,
        discountAmount: state.discountAmount, orderNotes: state.orderNotes,
        selectedShippingRate: state.selectedShippingRate, buyNowItem: state.buyNowItem,
        buyNowDiscountAmount: state.buyNowDiscountAmount,
        buyNowCouponDiscount: state.buyNowCouponDiscount, buyNowCouponCode: state.buyNowCouponCode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const totals = recalculate(state.items);
        state.subtotalAmount = totals.subtotalAmount;
        state.totalAmount = totals.totalAmount;
        state.totalQuantity = totals.totalQuantity;
      },
    },
  ),
);
