"use server";

export interface CheckoutLineItem {
  merchandiseId: string;
  quantity: number;
}

export async function createCheckout(_items?: CheckoutLineItem[], _discountCode?: string, _buyerIdentity?: unknown): Promise<string | null> {
  void _items;
  void _discountCode;
  void _buyerIdentity;
  return "/checkout";
}
