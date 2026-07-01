"use server";

import { shopifyFetch } from '@/lib/shopify';
import { cartCreateMutation } from '@/lib/queries';

export interface CheckoutLineItem {
  merchandiseId: string;
  quantity: number;
}

export async function createCheckout(items: CheckoutLineItem[], discountCode?: string, buyerIdentity?: any): Promise<string | null> {
  const { body } = await shopifyFetch<any>({
    query: cartCreateMutation,
    variables: {
      input: {
        lines: items,
        buyerIdentity: buyerIdentity,
        discountCodes: discountCode ? [discountCode] : []
      },
    },
  });

  const cart = body.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) {
    console.error("Cart creation failed", body.data?.cartCreate?.userErrors);
    return null;
  }

  return cart.checkoutUrl;
}
