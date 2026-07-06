"use server";

export interface CheckoutLineItem {
  merchandiseId: string;
  quantity: number;
}

export async function createCheckout(items: CheckoutLineItem[], discountCode?: string, buyerIdentity?: any): Promise<string | null> {
  return "/checkout";
}
