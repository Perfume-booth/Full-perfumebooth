"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";


/* ── Account Actions ── */

// Update Personal Info
export async function updateProfileAction(prevState: any, formData: FormData) {
  try {
    const cookieStore = cookies();
    const tokenCookie = (await cookieStore).get("customerAccessToken");

    if (!tokenCookie?.value) {
      return { message: "You are not logged in", success: false };
    }

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const gender = formData.get("gender") as string;

    // TODO: Replace with your own backend API call
    console.log("updateProfileAction: Shopify removed. Data:", { firstName, lastName, phone, gender });

    revalidatePath("/account");
    return { message: "Profile updated successfully", success: true };
  } catch (error: any) {
    console.error("Account update action error:", error);
    return { message: "Failed to update profile", success: false };
  }
}

// Add Address
export async function addAddressAction(prevState: any, formData: FormData) {
  try {
    const cookieStore = cookies();
    const tokenCookie = (await cookieStore).get("customerAccessToken");

    if (!tokenCookie?.value) {
      return { message: "You are not logged in", success: false };
    }

    const address = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      address1: formData.get("address1") as string,
      address2: formData.get("address2") as string,
      city: formData.get("city") as string,
      province: formData.get("province") as string,
      country: formData.get("country") as string || "India",
      zip: formData.get("zip") as string,
      phone: formData.get("phone") as string,
    };

    // TODO: Replace with your own backend API call
    console.log("addAddressAction: Shopify removed. Address:", address);

    revalidatePath("/account");
    return { message: "Address added successfully", success: true };
  } catch (error: any) {
    console.error("Add address error:", error);
    return { message: "Failed to add address", success: false };
  }
}

// Update Address
export async function updateAddressAction(prevState: any, formData: FormData) {
  try {
    const cookieStore = cookies();
    const tokenCookie = (await cookieStore).get("customerAccessToken");

    if (!tokenCookie?.value) {
      return { message: "You are not logged in", success: false };
    }

    const id = formData.get("addressId") as string;
    if (!id) return { message: "Missing address ID", success: false };

    const address = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      address1: formData.get("address1") as string,
      address2: formData.get("address2") as string,
      city: formData.get("city") as string,
      province: formData.get("province") as string,
      country: formData.get("country") as string,
      zip: formData.get("zip") as string,
      phone: formData.get("phone") as string,
    };

    // TODO: Replace with your own backend API call
    console.log("updateAddressAction: Shopify removed. ID:", id, "Address:", address);

    revalidatePath("/account");
    return { message: "Address updated successfully", success: true };
  } catch (error: any) {
    console.error("Update address error:", error);
    return { message: "Failed to update address", success: false };
  }
}

// Delete Address
export async function deleteAddressAction(id: string) {
  try {
    const cookieStore = cookies();
    const tokenCookie = (await cookieStore).get("customerAccessToken");

    if (!tokenCookie?.value) {
      return { message: "You are not logged in", success: false };
    }

    // TODO: Replace with your own backend API call
    console.log("deleteAddressAction: Shopify removed. ID:", id);

    revalidatePath("/account");
    return { message: "Address deleted successfully", success: true };
  } catch (error: any) {
    console.error("Delete address error:", error);
    return { message: "Failed to delete address", success: false };
  }
}

// Set Default Address
export async function setDefaultAddressAction(id: string) {
  try {
    const cookieStore = cookies();
    const tokenCookie = (await cookieStore).get("customerAccessToken");

    if (!tokenCookie?.value) {
      return { message: "You are not logged in", success: false };
    }

    // TODO: Replace with your own backend API call
    console.log("setDefaultAddressAction: Shopify removed. ID:", id);

    revalidatePath("/account");
    return { message: "Default address updated", success: true };
  } catch (error: any) {
    console.error("Set default address error:", error);
    return { message: "Failed to update default address", success: false };
  }
}

/* ── Cart & Other Actions ── */

export async function updateCartDiscountAction(discountCodes: string[], clientCartId?: string) {
  // TODO: Replace with your own backend API call
  console.log("updateCartDiscountAction: Shopify removed.", { discountCodes, clientCartId });
  return null;
}


export async function loadMoreCollectionProducts(handle: string, after: string, filterOptions?: any, sortKey?: string, reverse?: boolean) {
  // TODO: Replace with your own backend API call
  console.log("loadMoreCollectionProducts: Shopify removed.", { handle, after });
  return null;
}

export async function getCartId() {
  const cookieStore = await cookies();
  return cookieStore.get("cartId")?.value || null;
}

export async function fetchCart() {
  console.log("fetchCart: Shopify mock.");
  return await getMockCart();
}

export async function createBuyNowCartAction(variantId: string, quantity: number) {
  // TODO: Replace with your own backend API call
  console.log("createBuyNowCartAction: Shopify removed.", { variantId, quantity });
  return null;
}

async function getMockCart() {
  const cookieStore = await cookies();
  const mockCartCookie = cookieStore.get("mockCart")?.value;
  if (mockCartCookie) {
    try {
      return JSON.parse(mockCartCookie);
    } catch (e) {
      // ignore
    }
  }
  return {
    id: "mock-cart-id",
    checkoutUrl: "/checkout",
    cost: {
      subtotalAmount: { amount: "0.00", currencyCode: "INR" },
      totalAmount: { amount: "0.00", currencyCode: "INR" }
    },
    lines: { edges: [] },
    discountCodes: []
  };
}

async function saveMockCart(cart: any) {
  const cookieStore = await cookies();
  cookieStore.set("mockCart", JSON.stringify(cart), {
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

export async function addCartItemAction(variantId: string, quantity: number, currentLines?: { merchandiseId: string; quantity: number }[]) {
  console.log("addCartItemAction: Shopify mock.", { variantId, quantity });
  const cart = await getMockCart();
  const cleanId = variantId.replace("gid://shopify/ProductVariant/", "");
  
  const existingLineIdx = cart.lines.edges.findIndex((edge: any) => edge.node.merchandise.id === variantId);
  if (existingLineIdx >= 0) {
    cart.lines.edges[existingLineIdx].node.quantity += quantity;
  } else {
    cart.lines.edges.push({
      node: {
        id: `line-${Date.now()}`,
        quantity: quantity,
        cost: {
          totalAmount: { amount: (1299 * quantity).toString(), currencyCode: "INR" }
        },
        merchandise: {
          id: variantId,
          title: "Default Title",
          requiresShipping: true,
          quantityAvailable: 50,
          product: {
            id: undefined,
            handle: "ahmed-al-maghribi-exotic-edp-100ml-unisex-perfume",
            title: "Ahmed Al Maghribi Exotic EDP 100ml Unisex Perfume",
            featuredImage: { url: "" }
          }
        }
      }
    });
  }
  
  let subtotal = 0;
  cart.lines.edges.forEach((edge: any) => {
    subtotal += 1299 * edge.node.quantity;
    edge.node.cost.totalAmount.amount = (1299 * edge.node.quantity).toString();
  });
  
  cart.cost.subtotalAmount.amount = subtotal.toString();
  cart.cost.totalAmount.amount = subtotal.toString();
  
  await saveMockCart(cart);
  return cart;
}

export async function updateCartItemAction(lineId: string, quantity: number, clientCartId?: string) {
  console.log("updateCartItemAction: Shopify mock.", { lineId, quantity });
  const cart = await getMockCart();
  
  const lineIdx = cart.lines.edges.findIndex((edge: any) => edge.node.id === lineId);
  if (lineIdx >= 0) {
    cart.lines.edges[lineIdx].node.quantity = quantity;
  }
  
  let subtotal = 0;
  cart.lines.edges.forEach((edge: any) => {
    subtotal += 1299 * edge.node.quantity;
    edge.node.cost.totalAmount.amount = (1299 * edge.node.quantity).toString();
  });
  
  cart.cost.subtotalAmount.amount = subtotal.toString();
  cart.cost.totalAmount.amount = subtotal.toString();
  
  await saveMockCart(cart);
  return cart;
}

export async function removeCartItemAction(lineId: string, clientCartId?: string) {
  console.log("removeCartItemAction: Shopify mock.", { lineId });
  const cart = await getMockCart();
  
  cart.lines.edges = cart.lines.edges.filter((edge: any) => edge.node.id !== lineId);
  
  let subtotal = 0;
  cart.lines.edges.forEach((edge: any) => {
    subtotal += 1299 * edge.node.quantity;
    edge.node.cost.totalAmount.amount = (1299 * edge.node.quantity).toString();
  });
  
  cart.cost.subtotalAmount.amount = subtotal.toString();
  cart.cost.totalAmount.amount = subtotal.toString();
  
  await saveMockCart(cart);
  return cart;
}

export async function updateCartBuyerIdentityAction(customerAccessToken: string, clientCartId?: string) {
  // TODO: Replace with your own backend API call
  console.log("updateCartBuyerIdentityAction: Shopify removed.");
  return null;
}

export async function trackShiprocketOrder(orderNumber: string, email: string) {
  // TODO: Replace with your own backend API call
  console.log("trackShiprocketOrder: Shopify removed.", { orderNumber, email });
  return { success: false, error: "Shopify connection removed. Not implemented." };
}

// Get Logged In User's Default Address for Navbar
export async function getLoggedAddressAction() {
  // TODO: Replace with your own backend API call
  console.log("getLoggedAddressAction: Shopify removed.");
  return null;
}

export async function getCustomerOrdersAction() {
  // TODO: Replace with your own backend API call
  console.log("getCustomerOrdersAction: Shopify removed.");
  return { success: false, message: "Shopify connection removed. Not implemented.", orders: [] };
}

export async function getAdminOrderAction(orderName: string) {
  // TODO: Replace with your own backend API call
  console.log("getAdminOrderAction: Shopify removed.", { orderName });
  return { success: false, error: "Shopify connection removed. Not implemented." };
}

export async function getAdminOrderByIdAction(orderId: string) {
  // TODO: Replace with your own backend API call
  console.log("getAdminOrderByIdAction: Shopify removed.", { orderId });
  return { success: false, error: "Shopify connection removed. Not implemented." };
}


export interface Coupon {
  code: string;
  description: string;
  discount: number;
  isFirstTime?: boolean;
}

export async function getAvailableCoupons(customerEmail?: string): Promise<Coupon[]> {
  // TODO: Replace with your own backend API call
  const publicCoupons: Coupon[] = [
    { code: "SAVE10", description: "Save 10% on your order", discount: 10 },
    { code: "BLOOM15", description: "Spring Special: 15% off", discount: 15 },
  ];
  return publicCoupons;
}

export interface ProductOffer {
  code: string;
  description: string;
  type: 'global' | 'specific' | 'new_user';
}

export async function getProductOffers(productId: string, productTags: string[] = [], collections: string[] = [], customerEmail?: string): Promise<ProductOffer[]> {
  const offers: ProductOffer[] = [];

  // Universal Coupons
  offers.push({ code: 'FREESHIP', description: 'Free shipping on all orders', type: 'global' });
  offers.push({ code: 'SAVE10', description: 'Save 10% on your order', type: 'global' });

  // Conditional / Product-Specific Coupons (no Shopify dependency)
  const collectionsLower = collections.map(c => c.toLowerCase());
  const tagsLower = productTags.map(t => t.toLowerCase());

  if (collectionsLower.includes('men') || tagsLower.includes('men')) {
    offers.push({ code: 'MEN15', description: "15% off Men's Fragrances", type: 'specific' });
  }
  
  if (collectionsLower.includes('women') || tagsLower.includes('women')) {
    offers.push({ code: 'WOMEN15', description: "15% off Women's Fragrances", type: 'specific' });
  }

  return offers;
}

export async function cancelOrder(orderId: string, customerId: string) {
  // TODO: Replace with your own backend API call
  console.log("cancelOrder: Shopify removed.", { orderId, customerId });
  return { success: false, error: "Shopify connection removed. Not implemented." };
}

export async function getGuestOrderAction(orderName: string, email: string) {
  // TODO: Replace with your own backend API call
  console.log("getGuestOrderAction: Shopify removed.", { orderName, email });
  return { success: false, error: "Shopify connection removed. Not implemented." };
}

export async function getProductAction(handle: string) {
  // TODO: Replace with your own backend API call
  console.log("getProductAction: Shopify removed.", { handle });
  return null;
}
 