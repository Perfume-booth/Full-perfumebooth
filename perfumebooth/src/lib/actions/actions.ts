"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";


import {
  updateCustomer, 
  createCustomerAddress, 
  updateCustomerAddress, 
  deleteCustomerAddress, 
  updateDefaultAddress 
} from "../backend/customer";
import { getCollectionProducts } from "../backend/collections";

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

    const res = await updateCustomer(tokenCookie.value, { firstName, lastName, phone });
    if (res.customerUserErrors && res.customerUserErrors.length > 0) {
      return { message: res.customerUserErrors[0].message, success: false };
    }

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

    const res = await createCustomerAddress(tokenCookie.value, address);
    if (res.customerUserErrors && res.customerUserErrors.length > 0) {
      return { message: res.customerUserErrors[0].message, success: false };
    }

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

    const res = await updateCustomerAddress(tokenCookie.value, id, address);
    if (res.customerUserErrors && res.customerUserErrors.length > 0) {
      return { message: res.customerUserErrors[0].message, success: false };
    }

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

    const res = await deleteCustomerAddress(tokenCookie.value, id);
    if (res.customerUserErrors && res.customerUserErrors.length > 0) {
      return { message: res.customerUserErrors[0].message, success: false };
    }

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

    const res = await updateDefaultAddress(tokenCookie.value, id);
    if (res.customerUserErrors && res.customerUserErrors.length > 0) {
      return { message: res.customerUserErrors[0].message, success: false };
    }

    revalidatePath("/account");
    return { message: "Default address updated", success: true };
  } catch (error: any) {
    console.error("Set default address error:", error);
    return { message: "Failed to update default address", success: false };
  }
}

/* ── Cart & Other Actions ── */

export async function loadMoreCollectionProducts(handle: string, after: string, filterOptions?: any, sortKey?: string, reverse?: boolean) {
  return getCollectionProducts(handle, 20, after, filterOptions, sortKey, reverse);
}

export async function trackShiprocketOrder(orderNumber: string, email: string) {
  // TODO: Replace with your own backend API call
  console.log("trackShiprocketOrder is not implemented yet.", { orderNumber, email });
  return { success: false, error: "Order tracking is not implemented yet." };
}

// Get Logged In User's Default Address for Navbar
export async function getLoggedAddressAction() {
  // TODO: Replace with your own backend API call
  console.log("getLoggedAddressAction is not implemented yet.");
  return null;
}

export async function getCustomerOrdersAction() {
  // TODO: Replace with your own backend API call
  console.log("getCustomerOrdersAction is not implemented yet.");
  return { success: false, message: "Order lookup is not implemented yet.", orders: [] };
}

export async function getAdminOrderAction(orderName: string) {
  // TODO: Replace with your own backend API call
  console.log("getAdminOrderAction is not implemented yet.", { orderName });
  return { success: false, error: "Order lookup is not implemented yet." };
}

export async function getAdminOrderByIdAction(orderId: string) {
  // TODO: Replace with your own backend API call
  console.log("getAdminOrderByIdAction is not implemented yet.", { orderId });
  return { success: false, error: "Order lookup is not implemented yet." };
}


export interface Coupon {
  code: string;
  description: string;
  discount: number;
  isFirstTime?: boolean;
}

export async function getAvailableCoupons(_customerEmail?: string): Promise<Coupon[]> {
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

export async function getProductOffers(productId: string, productTags: string[] = [], collections: string[] = [], _customerEmail?: string): Promise<ProductOffer[]> {
  const offers: ProductOffer[] = [];

  // Universal Coupons
  offers.push({ code: 'FREESHIP', description: 'Free shipping on all orders', type: 'global' });
  offers.push({ code: 'SAVE10', description: 'Save 10% on your order', type: 'global' });

  // Conditional and product-specific coupons
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

export async function cancelOrder(orderId: string, _customerId?: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("customerAccessToken")?.value;
    const baseUrl = process.env.DJANGO_API_URL || process.env.BACKEND_API_URL || "http://localhost:8000";
    const res = await fetch(`${baseUrl}/api/v1/orders/${orderId}/cancel/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ reason: "Cancelled by customer" }),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || "Failed to cancel order." };
    }
    revalidatePath("/account");
    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Order cancellation error:", error);
    return { success: false, error: error.message || "Failed to cancel order." };
  }
}

export async function getGuestOrderAction(orderName: string, email: string) {
  // TODO: Replace with your own backend API call
  console.log("getGuestOrderAction is not implemented yet.", { orderName, email });
  return { success: false, error: "Guest order lookup is not implemented yet." };
}

export async function getProductAction(handle: string) {
  // TODO: Replace with your own backend API call
  console.log("getProductAction is not implemented yet.", { handle });
  return null;
}
