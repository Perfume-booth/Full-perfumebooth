"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import { fetchCart } from "@/lib/actions/actions";

/**
 * Ensures the client-side cart store is in sync with the Shopify backend.
 * This is crucial because cartId is now stored in an HTTP-only cookie
 * and cannot be read directly by client-side JS.
 */
export default function CartHydrator() {
  const { syncShopifyCart } = useCartStore();

  useEffect(() => {
    const hydrateCart = async () => {
      try {
        const cart = await fetchCart();
        if (cart) {
          syncShopifyCart(cart);
        }
      } catch (error) {
        console.error("Failed to hydrate cart:", error);
      }
    };
    
    hydrateCart();
  }, [syncShopifyCart]);

  return null;
}
