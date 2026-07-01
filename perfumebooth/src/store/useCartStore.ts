import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/app/products/[slug]/page';
import { addCartItemAction, updateCartItemAction, removeCartItemAction, updateCartDiscountAction } from '@/lib/actions/actions';

export interface CartItem extends Product {
  cartQuantity: number;
  selectedVariantTitle?: string;
  selectedVariantId?: string;
  lineId?: string; // Shopify's cart line item ID
  handle:string;
  requiresShipping?: boolean;
}

export interface ShippingRate {
  handle: string;
  title: string;
  amount: number;
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

  // Shopify synced totals
  shopifyCartId: string | null;
  checkoutUrl: string | null;
  subtotalAmount: number;
  totalAmount: number;
  totalQuantity: number;

  // Shipping details
  availableShippingRates: ShippingRate[];
  selectedShippingRate: ShippingRate | null;

  // Buy Now Flow
  buyNowItem: CartItem | null;
  buyNowShopifyCartId: string | null;
  buyNowCheckoutUrl: string | null;
  buyNowDiscountAmount: number;
  buyNowCouponDiscount: number;
  buyNowCouponCode: string;

  // Actions
  addToCart: (product: any, quantity: number) => Promise<void>;
  removeFromCart: (productId: number | string, variantId?: string) => Promise<void>;
  updateQuantity: (productId: number | string, quantity: number, variantId?: string) => Promise<void>;
  clearCart: () => void;
  setCheckingOut: (status: boolean) => void;
  syncShopifyCart: (cart: any) => void;

  // Buy Now Actions
  buyNow: (product: any, quantity: number) => Promise<void>;
  clearBuyNow: () => void;
  updateBuyNowQuantity: (quantity: number) => Promise<void>;

  // UI & Form Actions
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  applyCoupon: (code: string, providedDiscount?: number) => Promise<boolean>;
  setOrderNotes: (notes: string) => void;
  setShippingRates: (rates: ShippingRate[]) => void;
  setSelectedShippingRate: (rate: ShippingRate | null) => void;

  // Computed values (Now backed by Shopify API, returning fallback optimistic if not yet synced)
  totalItems: () => number;
  cartTotal: () => number;
  finalTotalAmount: () => number;
}

// Map to hold timeouts for debouncing Shopify cart syncs per line item
const updateQuantityTimeouts: Record<string, NodeJS.Timeout> = {};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: '',
      couponDiscount: 0,
      discountAmount: 0,
      discountErrorMessage: null,
      isApplyingDiscount: false,
      orderNotes: '',
      isCheckingOut: false,

      shopifyCartId: null,
      checkoutUrl: null,
      subtotalAmount: 0,
      totalAmount: 0,
      totalQuantity: 0,

      availableShippingRates: [],
      selectedShippingRate: null,

      buyNowItem: null,
      buyNowShopifyCartId: null,
      buyNowCheckoutUrl: null,
      buyNowDiscountAmount: 0,
      buyNowCouponDiscount: 0,
      buyNowCouponCode: '',

      syncShopifyCart: (cart: any) => {
        if (!cart) return;
        set((state) => {
          const lines = cart.lines?.edges || [];
          
          // Reconstruct items from Shopify cart lines to ensure perfect sync
          const updatedItems = lines.map((edge: any) => {
            const node = edge.node;
            const merchandise = node.merchandise;
            const shopifyProduct = merchandise?.product;
            
            // Try to find existing local item to preserve any non-Shopify metadata if needed
            const existingItem = state.items.find(item => item.selectedVariantId === merchandise?.id);
            
            const unitPrice = parseFloat(node.cost?.totalAmount?.amount || "0") / node.quantity;
            const comparePrice = merchandise?.compareAtPrice?.amount 
              ? parseFloat(merchandise.compareAtPrice.amount)
              : (existingItem?.discount_price ? parseFloat(existingItem.discount_price) : null);
            const hasDiscount = comparePrice && comparePrice > unitPrice 
              ? true 
              : (existingItem?.has_discount ?? false);

            return {
              id: shopifyProduct?.id || existingItem?.id || '',
              handle: shopifyProduct?.handle || existingItem?.handle || '',
              title: shopifyProduct?.title || existingItem?.title || 'Unknown Product',
              image: shopifyProduct?.featuredImage?.url || existingItem?.image || '',
              price: unitPrice.toString(),
              discount_price: comparePrice ? comparePrice.toString() : null,
              has_discount: hasDiscount,
              cartQuantity: node.quantity,
              lineId: node.id,
              selectedVariantId: merchandise?.id || '',
              selectedVariantTitle: (merchandise?.title && merchandise?.title !== "Default Title") ? merchandise.title : '',
              stock_count: typeof merchandise?.quantityAvailable === 'number'
                ? merchandise.quantityAvailable
                : (existingItem?.stock_count || 50),
              requiresShipping: merchandise?.requiresShipping !== false,
            };
          });

          // Sync coupon info returned by Shopify
          const discountCodes = cart.discountCodes || [];
          const activeDiscountNode = discountCodes.find((dc: any) => dc.applicable);
          const couponCode = activeDiscountNode ? activeDiscountNode.code.toUpperCase() : "";
          
          const subtotalVal = parseFloat(cart.cost?.subtotalAmount?.amount || "0");
          const totalVal = parseFloat(cart.cost?.totalAmount?.amount || "0");
          const discountAmt = Math.max(0, subtotalVal - totalVal);
          
          // Compute approximate discount percentage from active discount values for display compatibility
          const couponDiscount = subtotalVal > 0 ? (discountAmt / subtotalVal) * 100 : 0;

          const hasPhysicalItems = updatedItems.some((item: any) => item.requiresShipping);

          let selectedShippingRate = state.selectedShippingRate;
          if (hasPhysicalItems) {
            if (subtotalVal >= 999) {
              // Cart subtotal >= 999 always gets free shipping automatically
              if (!selectedShippingRate || selectedShippingRate.amount !== 0) {
                selectedShippingRate = { title: "Complimentary Free Shipping", amount: 0, handle: "free-shipping" };
              }
            } else {
              // Cart subtotal < 999 must pay for shipping. 
              // If previous rate was free (amount 0), force to Standard Shipping (₹119)
              if (!selectedShippingRate || selectedShippingRate.amount === 0) {
                selectedShippingRate = { title: "Standard Shipping", amount: 119, handle: "default-paid" };
              }
            }
          } else {
            selectedShippingRate = null;
          }

          const availableRates = hasPhysicalItems
            ? (state.availableShippingRates.length > 0 ? state.availableShippingRates : (selectedShippingRate ? [selectedShippingRate] : []))
            : [];

          return {
            shopifyCartId: cart.id,
            checkoutUrl: cart.checkoutUrl,
            subtotalAmount: subtotalVal,
            totalAmount: totalVal,
            totalQuantity: cart.totalQuantity || 0,
            items: updatedItems,
            couponCode,
            couponDiscount,
            discountAmount: discountAmt,
            discountErrorMessage: null,
            selectedShippingRate,
            availableShippingRates: availableRates
          };
        });
      },

      setCheckingOut: (status: boolean) => set({ isCheckingOut: status }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      applyCoupon: async (code: string, providedDiscount?: number) => {
        const upperCode = code.toUpperCase().trim();
        const previousCode = get().couponCode;
        const previousDiscount = get().couponDiscount;
        const previousDiscountAmount = get().discountAmount;

        set({ isApplyingDiscount: true, discountErrorMessage: null });

        // If trying to clear the coupon
        if (upperCode === "") {
          try {
            const cartIdToUse = get().buyNowItem ? get().buyNowShopifyCartId : get().shopifyCartId;
            if (cartIdToUse) {
              const updatedCart = await updateCartDiscountAction([], cartIdToUse || undefined);
              if (updatedCart) {
                if (get().buyNowItem) {
                  set({ buyNowCouponCode: "", buyNowCouponDiscount: 0, buyNowDiscountAmount: 0, isApplyingDiscount: false });
                } else {
                  get().syncShopifyCart(updatedCart);
                  set({ isApplyingDiscount: false });
                }
                return true;
              }
            }
            if (get().buyNowItem) {
              set({ buyNowCouponCode: "", buyNowCouponDiscount: 0, buyNowDiscountAmount: 0, isApplyingDiscount: false });
            } else {
              set({ couponCode: "", couponDiscount: 0, discountAmount: 0, isApplyingDiscount: false, discountErrorMessage: null });
            }
            return true;
          } catch (error: any) {
            console.error("Error clearing coupon:", error);
            set({ isApplyingDiscount: false, discountErrorMessage: "Failed to clear discount code." });
            return false;
          }
        }

        // Apply via Shopify backend (absolute single source of truth, completely removing static/fallback validations)
        const state = get();
        const cartIdToUse = state.buyNowItem ? state.buyNowShopifyCartId : state.shopifyCartId;
        if (cartIdToUse) {
          try {
            const updatedCart = await updateCartDiscountAction([upperCode], cartIdToUse || undefined);
            if (updatedCart) {
              // Read the discount codes list returned by Shopify
              const discountCodes = updatedCart.discountCodes || [];
              const appliedNode = discountCodes.find((dc: any) => dc.code.toUpperCase() === upperCode && dc.applicable);

              if (appliedNode) {
                if (state.buyNowItem) {
                  const subtotalVal = parseFloat(updatedCart.cost?.subtotalAmount?.amount || "0");
                  const totalVal = parseFloat(updatedCart.cost?.totalAmount?.amount || "0");
                  const discountAmt = Math.max(0, subtotalVal - totalVal);
                  const couponDiscount = subtotalVal > 0 ? (discountAmt / subtotalVal) * 100 : 0;
                  set({
                    buyNowDiscountAmount: discountAmt,
                    buyNowCouponDiscount: couponDiscount,
                    buyNowCouponCode: upperCode,
                    isApplyingDiscount: false
                  });
                } else {
                  get().syncShopifyCart(updatedCart);
                  set({ isApplyingDiscount: false });
                }
                return true;
              } else {
                // Succeeded network request but code is not applicable/invalid
                set({
                  couponCode: previousCode,
                  couponDiscount: previousDiscount,
                  discountAmount: previousDiscountAmount,
                  discountErrorMessage: `Discount code "${upperCode}" is invalid or not applicable to your order.`,
                  isApplyingDiscount: false
                });
                return false;
              }
            } else {
              // Shopify returned null (e.g. backend validation failure or bad request)
              set({
                couponCode: previousCode,
                couponDiscount: previousDiscount,
                discountAmount: previousDiscountAmount,
                discountErrorMessage: `Invalid discount code: "${upperCode}"`,
                isApplyingDiscount: false
              });
              return false;
            }
          } catch (error: any) {
            console.error("Error applying coupon to Shopify:", error);
            set({
              couponCode: previousCode,
              couponDiscount: previousDiscount,
              discountAmount: previousDiscountAmount,
              discountErrorMessage: error.message || "Failed to validate discount code with Shopify.",
              isApplyingDiscount: false
            });
            return false;
          }
        } else {
          set({
            discountErrorMessage: "No active cart session found. Please add items to your cart first.",
            isApplyingDiscount: false
          });
          return false;
        }
      },

      buyNow: async (product: any, quantity: number) => {
        const variantId = (product as any).selectedVariantId || (product.variants as any)?.edges?.[0]?.node?.id || (product.variants as any)?.[0]?.id;
        if (!variantId) {
          console.error("buyNow: No variantId found for product", product);
          return;
        }

        const formattedVariantId = String(variantId).includes('gid://') ? String(variantId) : `gid://shopify/ProductVariant/${variantId}`;

        // Create optimistic Buy Now item
        const buyNowItem = {
          ...product,
          cartQuantity: quantity,
          selectedVariantId: formattedVariantId
        };

        set({
          buyNowItem,
          buyNowShopifyCartId: null,
          buyNowCheckoutUrl: null,
          buyNowDiscountAmount: 0,
          buyNowCouponDiscount: 0,
          buyNowCouponCode: ''
        });

        // Server Action: Create separate temporary Shopify Cart for this single item
        const { createBuyNowCartAction } = await import('@/lib/actions/actions');
        const cart = await createBuyNowCartAction(formattedVariantId, quantity);
        if (cart) {
          const lines = cart.lines?.edges || [];
          const node = lines[0]?.node;
          set({
            buyNowShopifyCartId: cart.id,
            buyNowCheckoutUrl: cart.checkoutUrl,
            buyNowItem: {
              ...buyNowItem,
              lineId: node?.id || ''
            }
          });
        }
      },

      clearBuyNow: () => set({
        buyNowItem: null,
        buyNowShopifyCartId: null,
        buyNowCheckoutUrl: null,
        buyNowDiscountAmount: 0,
        buyNowCouponDiscount: 0,
        buyNowCouponCode: ''
      }),

      updateBuyNowQuantity: async (quantity: number) => {
        const buyNowItem = get().buyNowItem;
        const buyNowShopifyCartId = get().buyNowShopifyCartId;
        if (!buyNowItem || !buyNowShopifyCartId) return;

        const maxStock = buyNowItem.stock_count || 50;
        const safeQty = Math.max(1, Math.min(quantity, maxStock));

        if (safeQty === buyNowItem.cartQuantity) return;

        // Optimistic update
        set({
          buyNowItem: {
            ...buyNowItem,
            cartQuantity: safeQty
          }
        });

        // Server Action: Update the Shopify cart quantity
        if (buyNowItem.lineId) {
          const updatedCart = await updateCartItemAction(buyNowItem.lineId, safeQty, buyNowShopifyCartId);
          if (updatedCart) {
            // Recalculate discount if coupon applied
            const subtotalVal = parseFloat(updatedCart.cost?.subtotalAmount?.amount || "0");
            const totalVal = parseFloat(updatedCart.cost?.totalAmount?.amount || "0");
            const discountAmt = Math.max(0, subtotalVal - totalVal);
            const couponDiscount = subtotalVal > 0 ? (discountAmt / subtotalVal) * 100 : 0;
            set({
              buyNowDiscountAmount: discountAmt,
              buyNowCouponDiscount: couponDiscount
            });
          }
        }
      },

      setOrderNotes: (notes: string) => set({ orderNotes: notes }),

      addToCart: async (product: any, quantity: number) => {
        // Strict variantId enforcement
        const variantId = (product as any).selectedVariantId || (product.variants as any)?.edges?.[0]?.node?.id || (product.variants as any)?.[0]?.id;

        if (!variantId) {
          console.error("addToCart: No variantId found for product", product);
          return;
        }

        const formattedVariantId = String(variantId).includes('gid://') ? String(variantId) : `gid://shopify/ProductVariant/${variantId}`;

        // Check if item already exists in cart — match by variantId ONLY for precise dedup
        const existingItem = get().items.find((item) =>
          item.selectedVariantId === formattedVariantId
        );

        const maxStock = product.stock_count || existingItem?.stock_count || 50;

        if (existingItem) {
          // Item exists: UPDATE its quantity (not add new)
          const newQty = Math.min(existingItem.cartQuantity + quantity, maxStock);
          if (newQty === existingItem.cartQuantity) return; // Already at max

          // Optimistic UI Update
          set((state) => {
            const newItems = state.items.map((item) => {
              if (item.selectedVariantId === formattedVariantId) {
                return { ...item, cartQuantity: newQty };
              }
              return item;
            });
            return {
              items: newItems,
              totalQuantity: newItems.reduce((acc, item) => acc + item.cartQuantity, 0)
            };
          });

          // Server Action: UPDATE the existing line in Shopify (not add a new line)
          const lineId = existingItem.lineId;
          if (lineId) {
            const updatedCart = await updateCartItemAction(lineId, newQty, get().shopifyCartId || undefined);
            if (updatedCart) get().syncShopifyCart(updatedCart);
          } else {
            // No lineId yet — fall back to addToCartLines for initial server sync
            const currentItems = get().items;
            const allItemsForShopify = currentItems.map(item => ({
              merchandiseId: item.selectedVariantId || '',
              quantity: item.cartQuantity
            })).filter(line => line.merchandiseId !== '');
            const updatedCart = await addCartItemAction(formattedVariantId, quantity, allItemsForShopify);
            if (updatedCart) get().syncShopifyCart(updatedCart);
          }
        } else {
          // New item: add to cart
          const initialQty = Math.min(quantity, maxStock);

          // Optimistic UI Update
          set((state) => {
            const newItems = [...state.items, { ...product, cartQuantity: initialQty, selectedVariantId: formattedVariantId }];
            return { 
              items: newItems,
              totalQuantity: newItems.reduce((acc, item) => acc + item.cartQuantity, 0)
            };
          });

          // Server Action: Add to Shopify Cart
          const currentItems = get().items;
          const allItemsForShopify = currentItems.map(item => ({
            merchandiseId: item.selectedVariantId || '',
            quantity: item.cartQuantity
          })).filter(line => line.merchandiseId !== '');

          const updatedCart = await addCartItemAction(formattedVariantId, initialQty, allItemsForShopify);
          if (updatedCart) {
            get().syncShopifyCart(updatedCart);
          }
        }
      },

      removeFromCart: async (productId, variantId) => {
        // Find lineId to remove from Shopify
        const itemToRemove = get().items.find((item) => String(item.id) === String(productId) && (!variantId || item.selectedVariantId === variantId));
        const lineId = itemToRemove?.lineId;

        // Optimistic UI Update
        set((state) => {
          const newItems = state.items.filter((item) => {
            if (String(item.id) !== String(productId)) return true;
            if (variantId && item.selectedVariantId !== variantId) return true;
            return false;
          });
          return {
            items: newItems,
            totalQuantity: newItems.reduce((acc, item) => acc + item.cartQuantity, 0)
          };
        });

        // Server Action: Remove from Shopify Cart
        if (lineId) {
          const updatedCart = await removeCartItemAction(lineId, get().shopifyCartId || undefined);
          if (updatedCart) get().syncShopifyCart(updatedCart);
        }
      },

      updateQuantity: async (productId, quantity, variantId) => {
        const itemToUpdate = get().items.find((item) => String(item.id) === String(productId) && (!variantId || item.selectedVariantId === variantId));
        if (!itemToUpdate) return;
        const lineId = itemToUpdate.lineId;
        const maxStock = itemToUpdate.stock_count || 50;
        const safeQty = Math.max(1, Math.min(quantity, maxStock));

        // Skip if quantity hasn't changed
        if (safeQty === itemToUpdate.cartQuantity) return;

        // Optimistic UI Update
        set((state) => {
          const newItems = state.items.map((item) => {
            const isMatch = String(item.id) === String(productId) && (!variantId || item.selectedVariantId === variantId);
            if (isMatch) {
              return { ...item, cartQuantity: safeQty };
            }
            return item;
          });
          return {
            items: newItems,
            totalQuantity: newItems.reduce((acc, item) => acc + item.cartQuantity, 0)
          };
        });

        // Server Action: Update Shopify Cart (Debounced)
        if (lineId) {
          if (updateQuantityTimeouts[lineId]) {
            clearTimeout(updateQuantityTimeouts[lineId]);
          }
          
          updateQuantityTimeouts[lineId] = setTimeout(async () => {
            try {
              const updatedCart = await updateCartItemAction(lineId, safeQty, get().shopifyCartId || undefined);
              if (updatedCart) get().syncShopifyCart(updatedCart);
            } catch (error) {
              console.error("Failed to sync cart quantity with Shopify:", error);
            } finally {
              delete updateQuantityTimeouts[lineId];
            }
          }, 400); // 400ms debounce
        }
      },

      clearCart: () => set({ 
        items: [], 
        shopifyCartId: null, 
        checkoutUrl: null, 
        subtotalAmount: 0, 
        totalAmount: 0, 
        totalQuantity: 0,
        availableShippingRates: [],
        selectedShippingRate: null
      }),

      totalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.cartQuantity, 0);
      },

      cartTotal: () => {
        // Return exact subtotalAmount from Shopify if available, fallback to optimistic calculate
        const state = get();
        if (state.subtotalAmount > 0) return state.subtotalAmount;
        return state.items.reduce((total, item) => {
          return total + (parseFloat(item.price) * item.cartQuantity);
        }, 0);
      },

      setShippingRates: (rates) => set({ availableShippingRates: rates }),
      
      setSelectedShippingRate: (rate) => set({ selectedShippingRate: rate }),

      finalTotalAmount: () => {
        const state = get();
        const subtotal = state.subtotalAmount > 0 ? state.subtotalAmount : state.cartTotal();
        const discount = state.subtotalAmount > 0 ? state.discountAmount : (subtotal * state.couponDiscount) / 100;
        
        const hasPhysicalItems = state.items.some((item) => item.requiresShipping !== false);
        if (!hasPhysicalItems) return Math.max(0, subtotal - discount);

        const isFreeShipping = subtotal >= 999;
        let shipping = 119;
        if (isFreeShipping) {
          shipping = 0;
        } else if (state.selectedShippingRate && state.selectedShippingRate.amount > 0) {
          shipping = state.selectedShippingRate.amount;
        }
        
        return Math.max(0, subtotal - discount + shipping);
      },
    }),
    {
      name: 'perfumebooth-cart',
    }
  )
);
