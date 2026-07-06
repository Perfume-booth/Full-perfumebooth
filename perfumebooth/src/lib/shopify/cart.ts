const MOCK_CART = {
  id: "mock-cart-id",
  checkoutUrl: "/checkout",
  cost: {
    subtotalAmount: { amount: "0.00", currencyCode: "INR" },
    totalAmount: { amount: "0.00", currencyCode: "INR" }
  },
  lines: { edges: [] as any[] },
  discountCodes: [] as any[]
};

export async function createCart(lines: any[], buyerIdentity?: any, discountCodes?: string[]) {
  return MOCK_CART;
}

export async function updateCartBuyerIdentity(cartId: string, buyerIdentity: any) {
  return MOCK_CART;
}

export async function getCart(cartId: string) {
  return MOCK_CART;
}

export async function addToCartLines(cartId: string, lines: any[]) {
  return MOCK_CART;
}

export async function updateCartLines(cartId: string, lines: any[]) {
  return MOCK_CART;
}

export async function removeFromCartLines(cartId: string, lineIds: string[]) {
  return MOCK_CART;
}

export async function updateCartDiscount(cartId: string, discountCodes: string[]) {
  return MOCK_CART;
}

