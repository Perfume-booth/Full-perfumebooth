import { 
  cartCreateMutation,
  cartBuyerIdentityUpdateMutation,
  getCartQuery,
  cartLinesAddMutation,
  cartLinesUpdateMutation,
  cartLinesRemoveMutation,
  cartDiscountCodesUpdateMutation
} from '../queries';
import { shopifyFetch } from './fetcher';

export async function createCart(lines: { merchandiseId: string; quantity: number }[], buyerIdentity?: any, discountCodes?: string[]) {
  const { body } = await shopifyFetch<any>({
    query: cartCreateMutation,
    variables: {
      input: {
        lines,
        buyerIdentity,
        discountCodes: discountCodes || []
      }
    }
  });

  if ((body.data?.cartCreate?.userErrors?.length ?? 0) > 0) {
    console.error("Shopify cartCreate userErrors:", body.data.cartCreate.userErrors);
    return null;
  }

  return body.data?.cartCreate?.cart || null;
}

export async function updateCartBuyerIdentity(cartId: string, buyerIdentity: any) {
  const { body } = await shopifyFetch<any>({
    query: cartBuyerIdentityUpdateMutation,
    variables: { cartId, buyerIdentity },
  });

  return body.data?.cartBuyerIdentityUpdate?.cart || null;
}

export async function getCart(cartId: string) {
  const { body } = await shopifyFetch<any>({
    query: getCartQuery,
    variables: { cartId },
    next: { revalidate: 0 } as any,
  });

  return body.data?.cart || null;
}

export async function addToCartLines(cartId: string, lines: { merchandiseId: string; quantity: number }[]) {
  const { body } = await shopifyFetch<any>({
    query: cartLinesAddMutation,
    variables: { cartId, lines },
  });

  if ((body.data?.cartLinesAdd?.userErrors?.length ?? 0) > 0) {
    console.error("Shopify cartLinesAdd userErrors:", body.data.cartLinesAdd.userErrors);
    return null;
  }

  return body.data?.cartLinesAdd?.cart || null;
}

export async function updateCartLines(cartId: string, lines: { id: string; quantity: number }[]) {
  const { body } = await shopifyFetch<any>({
    query: cartLinesUpdateMutation,
    variables: { cartId, lines },
  });

  if ((body.data?.cartLinesUpdate?.userErrors?.length ?? 0) > 0) {
    console.error("Shopify cartLinesUpdate userErrors:", body.data.cartLinesUpdate.userErrors);
    return null;
  }

  return body.data?.cartLinesUpdate?.cart || null;
}

export async function removeFromCartLines(cartId: string, lineIds: string[]) {
  const { body } = await shopifyFetch<any>({
    query: cartLinesRemoveMutation,
    variables: { cartId, lineIds },
  });

  if ((body.data?.cartLinesRemove?.userErrors?.length ?? 0) > 0) {
    console.error("Shopify cartLinesRemove userErrors:", body.data.cartLinesRemove.userErrors);
    return null;
  }

  return body.data?.cartLinesRemove?.cart || null;
}

export async function updateCartDiscount(cartId: string, discountCodes: string[]) {
  const { body } = await shopifyFetch<any>({
    query: cartDiscountCodesUpdateMutation,
    variables: { cartId, discountCodes },
  });

  if ((body.data?.cartDiscountCodesUpdate?.userErrors?.length ?? 0) > 0) {
    console.error("Shopify cartDiscountCodesUpdate userErrors:", body.data.cartDiscountCodesUpdate.userErrors);
    return null;
  }

  return body.data?.cartDiscountCodesUpdate?.cart || null;
}
