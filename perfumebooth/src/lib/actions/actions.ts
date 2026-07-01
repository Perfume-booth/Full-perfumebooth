"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  getCollectionProducts,
  createCart,
  getCart,
  addToCartLines,
  updateCartLines,
  removeFromCartLines,
  updateCartDiscount,
  updateCartBuyerIdentity,
  updateCustomer,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  updateDefaultAddress,
  getCustomer
} from "@/lib/shopify";
import { shopifyAdminFetch } from "@/lib/shopify/admin-fetcher";

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

    const customerInput: any = {};
    if (firstName) customerInput.firstName = firstName;
    if (lastName) customerInput.lastName = lastName;
    if (phone) customerInput.phone = phone.startsWith('+') ? phone : `+91${phone}`; 

    const res = await updateCustomer(tokenCookie.value, customerInput);

    if (res?.customerUserErrors && res.customerUserErrors.length > 0) {
      return { message: res.customerUserErrors[0].message, success: false };
    }

    // Update gender metafield via Admin API
    if (res?.customer?.id && typeof gender === "string") {
      const mutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        metafields: [
          {
            namespace: "custom",
            key: "gender",
            type: "single_line_text_field",
            value: gender,
            ownerId: res.customer.id
          }
        ]
      };

      const adminRes = await shopifyAdminFetch<any>({
        query: mutation,
        variables
      });

      if (adminRes.body.errors || adminRes.body.data?.metafieldsSet?.userErrors?.length > 0) {
        console.error("Gender sync error:", adminRes.body.errors || adminRes.body.data?.metafieldsSet?.userErrors);
      }

      // Concurrently update customer tags in Shopify Admin API for Storefront visibility
      try {
        const removeMutation = `
          mutation tagsRemove($id: ID!, $tags: [String!]!) {
            tagsRemove(id: $id, tags: $tags) {
              userErrors {
                field
                message
              }
            }
          }
        `;
        const removeRes = await shopifyAdminFetch<any>({
          query: removeMutation,
          variables: {
            id: res.customer.id,
            tags: ["gender_men", "gender_women", "gender_others"]
          }
        });
        if (removeRes.body.errors || removeRes.body.data?.tagsRemove?.userErrors?.length > 0) {
          console.error("Gender tag remove error:", removeRes.body.errors || removeRes.body.data?.tagsRemove?.userErrors);
        }

        if (gender) {
          const addMutation = `
            mutation tagsAdd($id: ID!, $tags: [String!]!) {
              tagsAdd(id: $id, tags: $tags) {
                userErrors {
                  field
                  message
                }
              }
            }
          `;
          const addRes = await shopifyAdminFetch<any>({
            query: addMutation,
            variables: {
              id: res.customer.id,
              tags: [`gender_${gender}`]
            }
          });
          if (addRes.body.errors || addRes.body.data?.tagsAdd?.userErrors?.length > 0) {
            console.error("Gender tag add error:", addRes.body.errors || addRes.body.data?.tagsAdd?.userErrors);
          }
        }
      } catch (tagErr) {
        console.error("Failed to sync customer gender tags:", tagErr);
      }
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

    if (res?.customerUserErrors && res.customerUserErrors.length > 0) {
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

    if (res?.customerUserErrors && res.customerUserErrors.length > 0) {
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

    if (res?.customerUserErrors && res.customerUserErrors.length > 0) {
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

    if (res?.customerUserErrors && res.customerUserErrors.length > 0) {
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

export async function updateCartDiscountAction(discountCodes: string[], clientCartId?: string) {
  try {
    const cartId = clientCartId || await getCartId();
    if (!cartId) return null;

    const cart = await updateCartDiscount(cartId, discountCodes);
    return cart;
  } catch (error) {
    console.error("Error updating cart discount:", error);
    return null;
  }
}


export async function loadMoreCollectionProducts(handle: string, after: string, filterOptions?: any, sortKey?: string, reverse?: boolean) {
  try {
    const data = await getCollectionProducts(handle, 80, after, filterOptions, sortKey, reverse);
    return data;
  } catch (error) {
    console.error("Error fetching more collection products:", error);
    return null;
  }
}

export async function getCartId() {
  const cookieStore = await cookies();
  return cookieStore.get("cartId")?.value || null;
}

export async function fetchCart() {
  const cartId = await getCartId();
  if (!cartId) return null;
  return await getCart(cartId);
}

export async function createBuyNowCartAction(variantId: string, quantity: number) {
  try {
    return await createCart([{ merchandiseId: variantId, quantity }]);
  } catch (error) {
    console.error("Error creating buy now cart:", error);
    return null;
  }
}

export async function addCartItemAction(variantId: string, quantity: number, currentLines?: { merchandiseId: string; quantity: number }[]) {
  try {
    let cartId = await getCartId();
    
    if (!cartId) {
      // Create new cart with all current items to prevent loss during race conditions
      const lines = currentLines && currentLines.length > 0 
        ? currentLines 
        : [{ merchandiseId: variantId, quantity }];
      
      const cart = await createCart(lines);
      if (cart?.id) {
        const cookieStore = await cookies();
        cookieStore.set("cartId", cart.id, { 
          path: "/", 
          maxAge: 60 * 60 * 24 * 30, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax"
        }); 
      }
      return cart;
    } else {
      // Add to existing cart
      let cart = await addToCartLines(cartId, [{ merchandiseId: variantId, quantity }]);
      
      // Auto-recovery: Verify that all client-side items are present in the Shopify cart
      if (cart && currentLines && currentLines.length > 0) {
        const cartVariantIds = (cart.lines?.edges || []).map((edge: any) => edge.node?.merchandise?.id);
        const hasAllItems = currentLines.every(line => cartVariantIds.includes(line.merchandiseId));
        
        if (!hasAllItems) {
          console.warn("Shopify cart out of sync, missing items from client. Re-syncing missing items...");
          const missingLines = currentLines.filter(line => !cartVariantIds.includes(line.merchandiseId));
          if (missingLines.length > 0) {
            const recoveryCart = await addToCartLines(cartId, missingLines);
            if (recoveryCart) {
              cart = recoveryCart;
            }
          }
        }
      }
      
      if (!cart) {
        // Fallback: If adding to the existing cart fails (e.g. cart expired or invalid),
        // delete the cookie and create a new cart with all current items.
        const cookieStore = await cookies();
        cookieStore.delete("cartId");
        
        const lines = currentLines && currentLines.length > 0 
          ? currentLines 
          : [{ merchandiseId: variantId, quantity }];
        
        const newCart = await createCart(lines);
        if (newCart?.id) {
          cookieStore.set("cartId", newCart.id, { 
            path: "/", 
            maxAge: 60 * 60 * 24 * 30, // 30 days
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
          }); 
        }
        return newCart;
      }
      
      return cart;
    }
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return null;
  }
}

export async function updateCartItemAction(lineId: string, quantity: number, clientCartId?: string) {
  try {
    const cartId = clientCartId || await getCartId();
    if (!cartId) return null;

    const cart = await updateCartLines(cartId, [{ id: lineId, quantity }]);
    return cart;
  } catch (error) {
    console.error("Error updating cart item:", error);
    return null;
  }
}

export async function removeCartItemAction(lineId: string, clientCartId?: string) {
  try {
    const cartId = clientCartId || await getCartId();
    if (!cartId) return null;

    const cart = await removeFromCartLines(cartId, [lineId]);
    return cart;
  } catch (error) {
    console.error("Error removing cart item:", error);
    return null;
  }
}

export async function updateCartBuyerIdentityAction(customerAccessToken: string, clientCartId?: string) {
  try {
    const cartId = clientCartId || await getCartId();
    if (!cartId) return null;

    const cart = await updateCartBuyerIdentity(cartId, { customerAccessToken });
    return cart;
  } catch (error) {
    console.error("Error updating cart buyer identity:", error);
    return null;
  }
}

export async function trackShiprocketOrder(orderNumber: string, email: string) {
  try {
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!domain || !clientId || !clientSecret) {
      return { success: false, error: "Missing Shopify OAuth Configuration" };
    }

    // 0. Get Temporary Access Token
    const authRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      }),
      cache: "no-store"
    });

    if (!authRes.ok) {
      console.error("Shopify OAuth Error:", await authRes.text());
      return { success: false, error: "Failed to authenticate with Shopify" };
    }

    const authData = await authRes.json();
    const adminToken = authData.access_token;

    if (!adminToken) {
      return { success: false, error: "Invalid OAuth response from Shopify" };
    }

    // 1. Fetch Order from Shopify Admin API
    const shopifyQuery = `
      query getOrderAWB($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              email
              displayFulfillmentStatus
              displayFinancialStatus
              fulfillments {
                trackingInfo {
                  number
                  company
                }
              }
              metafields(first: 5) {
                edges {
                  node {
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }
    `;

    const cleanOrderNumber = orderNumber.trim().replace(/^#/, "");
    const searchQuery = `name:${cleanOrderNumber} OR name:#${cleanOrderNumber}`;
    
    const shopifyRes = await fetch(`https://${domain}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
      body: JSON.stringify({
        query: shopifyQuery,
        variables: { query: searchQuery }
      }),
      cache: "no-store"
    });

    if (!shopifyRes.ok) {
      console.error("Shopify Admin API Error:", await shopifyRes.text());
      return { success: false, error: "Failed to query Shopify order" };
    }

    const shopifyData = await shopifyRes.json();
    const orderNode = shopifyData.data?.orders?.edges?.[0]?.node;

    if (!orderNode) {
      return { success: false, error: "Order not found" };
    }

    // 2. Validate Email
    if (orderNode.email?.toLowerCase() !== email.toLowerCase()) {
      return { success: false, error: "Email does not match the order" };
    }

    // 3. Extract AWB
    let awb = null;
    if (orderNode.fulfillments && orderNode.fulfillments.length > 0) {
      for (const fulfillment of orderNode.fulfillments) {
        if (fulfillment.trackingInfo && fulfillment.trackingInfo.length > 0) {
          awb = fulfillment.trackingInfo[0].number;
          if (awb) break;
        }
      }
    }

    if (!awb) {
      return { success: false, error: "No tracking number found for this order" };
    }

    // 4. Authenticate with Shiprocket
    const srEmail = process.env.SHIPROCKET_API_EMAIL;
    const srPassword = process.env.SHIPROCKET_API_PASSWORD;

    if (!srEmail || !srPassword) {
      return { success: false, error: "Missing Shiprocket Configuration" };
    }

    const srAuthRes = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: srEmail, password: srPassword }),
      cache: "no-store"
    });

    if (!srAuthRes.ok) {
      console.error("Shiprocket Auth Error:", await srAuthRes.text());
      return { success: false, error: "Failed to authenticate with Courier Service" };
    }

    const srAuthData = await srAuthRes.json();
    const srToken = srAuthData.token;

    if (!srToken) {
      return { success: false, error: "Invalid response from Courier Service auth" };
    }

    // 5. Fetch Tracking Data
    const srTrackRes = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${srToken}` },
      cache: "no-store"
    });

    if (!srTrackRes.ok) {
      console.error("Shiprocket Tracking Error:", await srTrackRes.text());
      return { success: false, error: "Failed to fetch tracking details" };
    }

    const trackData = await srTrackRes.json();
    
    // Parse activities (handle both track_activities and shipment_track_activities)
    let activities = trackData?.tracking_data?.track_activities || 
                     trackData?.tracking_data?.shipment_track_activities ||
                     trackData?.tracking_data?.tracking_data?.track_activities ||
                     trackData?.tracking_data?.tracking_data?.shipment_track_activities;
    
    activities = activities || [];

    let shipmentTrack = trackData?.tracking_data?.shipment_track;
    if (!shipmentTrack && trackData?.tracking_data?.tracking_data?.shipment_track) {
        shipmentTrack = trackData?.tracking_data?.tracking_data?.shipment_track;
    }
    shipmentTrack = shipmentTrack || [];

    const currentStatus = shipmentTrack.length > 0 ? shipmentTrack[0].current_status : "Unknown";
    const pickupDate = shipmentTrack.length > 0 ? shipmentTrack[0].pickup_date : null;
    const expectedDeliveryDate = shipmentTrack.length > 0 ? shipmentTrack[0].expected_delivery_date : null;
    const courierName = shipmentTrack.length > 0 ? shipmentTrack[0].courier_name : null;

    return { 
      success: true, 
      data: activities, 
      awb, 
      status: currentStatus,
      pickupDate,
      expectedDeliveryDate,
      courierName,
      // Pass along enriched data
      metafields: orderNode.metafields?.edges?.map((me: any) => me.node) || [],
      fulfillmentStatus: orderNode.displayFulfillmentStatus,
      financialStatus: orderNode.displayFinancialStatus
    };

  } catch (error: any) {
    console.error("Order tracking error:", error);
    return { success: false, error: "An unexpected error occurred during tracking" };
  }
}

// Get Logged In User's Default Address for Navbar
export async function getLoggedAddressAction() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("customerAccessToken");

    if (!tokenCookie?.value) return null;

    const { getCustomer } = await import("@/lib/shopify/customer");
    const customer = await getCustomer(tokenCookie.value);

    if (customer?.defaultAddress) {
      const addr = customer.defaultAddress;
      const label = [addr.address1, addr.city].filter(Boolean).join(", ");
      return {
        pincode: addr.zip,
        label: label || "Your Area"
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching logged address:", error);
    return null;
  }
}

export async function getCustomerOrdersAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("customerAccessToken")?.value;

    if (!token) {
      return { success: false, message: "Unauthorized", orders: [] };
    }

    const sessionCustomer = await getCustomer(token, "no-store");
    if (!sessionCustomer) {
      return { success: false, message: "Customer not found", orders: [] };
    }

    const adminToken = await getAdminToken();
    const domain = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
    
    if (!adminToken || !domain) {
      console.warn("Admin token/domain missing for getCustomerOrdersAction");
      return { success: false, message: "Admin configuration missing", orders: [] };
    }

    const cleanCustomerId = sessionCustomer.id.toString().replace(/\D/g, "");
    
    const response = await fetch(
      `https://${domain}/admin/api/2024-04/customers/${cleanCustomerId}/orders.json?status=any`,
      {
        headers: { 
          "X-Shopify-Access-Token": adminToken,
          "Content-Type": "application/json"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("REST API Error fetching customer orders:", response.status, errText);
      return { success: false, message: `REST API Error: ${response.status}`, orders: [] };
    }

    const { orders } = await response.json();

    return { 
      success: true, 
      orders: orders.map((o: any) => ({
        id: o.id.toString(),
        name: o.name,
        processedAt: o.processed_at,
        cancelledAt: o.cancelled_at,
        totalPrice: o.total_price,
        fulfillmentStatus: o.fulfillment_status,
        financialStatus: o.financial_status,
        customer: o.customer
      }))
    };
  } catch (error: any) {
    console.error("getCustomerOrdersAction Error:", error);
    return { success: false, message: error.message, orders: [] };
  }
}

/**
 * Helper to get an Admin Access Token using Client Credentials.
 * This is used because the primary SHOPIFY_ADMIN_ACCESS_TOKEN may lack read_orders scope.
 */
async function getAdminToken() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    console.error("Missing credentials for getAdminToken:", { domain: !!domain, clientId: !!clientId, clientSecret: !!clientSecret });
    return null;
  }

  try {
    const authRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      }),
      cache: "no-store"
    });

    if (!authRes.ok) {
      console.error("Auth token fetch failed:", authRes.status, await authRes.text());
      return null;
    }
    const authData = await authRes.json();
    return authData.access_token;
  } catch (e) {
    console.error("Error in getAdminToken:", e);
    return null;
  }
}

export async function getAdminOrderAction(orderName: string) {
  try {
    const token = await getAdminToken();
    const domain = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
    
    if (!token || !domain) {
      return { success: false, error: "Admin configuration missing" };
    }

    let queryUrl = `https://${domain}/admin/api/2024-04/orders.json?status=any`;
    if (orderName.startsWith("order_")) {
      queryUrl += `&tag=razorpay_order_id_${orderName}`;
    } else {
      const nameQuery = orderName.startsWith("#") ? orderName : `#${orderName}`;
      queryUrl += `&name=${encodeURIComponent(nameQuery)}`;
    }

    const response = await fetch(queryUrl, {
      headers: { "X-Shopify-Access-Token": token },
      cache: "no-store"
    });

    if (!response.ok) {
      return { success: false, error: `REST API Error: ${response.status}` };
    }

    const { orders } = await response.json();
    const order = orders?.[0];

    if (!order) return { success: false, error: "Order not found" };

    return { 
      success: true, 
      order: {
        id: order.id.toString(),
        name: order.name,
        cancelledAt: order.cancelled_at,
        fulfillmentStatus: order.fulfillment_status,
        financialStatus: order.financial_status,
        totalPrice: order.total_price,
        processedAt: order.processed_at,
        email: order.email,
        customer: order.customer,
        metafields: order.metafields || [],
        totalDiscounts: order.total_discounts,
        discountCodes: order.discount_codes,
        totalShipping: order.total_shipping_price_set?.shop_money?.amount || order.shipping_lines?.[0]?.price || "0"
      }
    };
  } catch (error: any) {
    console.error("getAdminOrderAction Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAdminOrderByIdAction(orderId: string) {
  try {
    const token = await getAdminToken();
    const domain = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
    
    if (!token || !domain) {
      return { success: false, error: "Admin configuration missing" };
    }

    const cleanId = orderId.split("/").pop()?.replace(/\D/g, "");
    
    const response = await fetch(
      `https://${domain}/admin/api/2024-04/orders/${cleanId}.json`,
      {
        headers: { "X-Shopify-Access-Token": token },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      return { success: false, error: `REST API Error: ${response.status}` };
    }

    const { order } = await response.json();

    if (!order) return { success: false, error: "Order not found" };

    return { 
      success: true, 
      order: {
        id: order.id.toString(),
        name: order.name,
        cancelledAt: order.cancelled_at,
        fulfillmentStatus: order.fulfillment_status,
        financialStatus: order.financial_status,
        totalPrice: order.total_price,
        processedAt: order.processed_at,
        email: order.email,
        customer: order.customer,
        metafields: order.metafields || [],
        totalDiscounts: order.total_discounts,
        discountCodes: order.discount_codes,
        totalShipping: order.total_shipping_price_set?.shop_money?.amount || order.shipping_lines?.[0]?.price || "0"
      }
    };
  } catch (error: any) {
    console.error("getAdminOrderByIdAction Error:", error);
    return { success: false, error: error.message };
  }
}


export interface Coupon {
  code: string;
  description: string;
  discount: number;
  isFirstTime?: boolean;
}

export async function getAvailableCoupons(customerEmail?: string): Promise<Coupon[]> {
  const publicCoupons: Coupon[] = [
    { code: "SAVE10", description: "Save 10% on your order", discount: 10 },
    { code: "BLOOM15", description: "Spring Special: 15% off", discount: 15 },
  ];

  if (!customerEmail) {
    return publicCoupons;
  }

  try {
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!domain || !clientId || !clientSecret) {
      console.error("Missing Shopify OAuth Configuration for coupons");
      return publicCoupons;
    }

    const authRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      }),
      cache: "no-store"
    });

    if (!authRes.ok) return publicCoupons;
    const authData = await authRes.json();
    const adminToken = authData.access_token;
    if (!adminToken) return publicCoupons;

    const query = `
      query getCustomerOrders($query: String!) {
        customers(first: 1, query: $query) {
          edges {
            node {
              ordersCount
            }
          }
        }
      }
    `;

    const shopifyRes = await fetch(`https://${domain}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
      body: JSON.stringify({
        query,
        variables: {
          query: `email:${customerEmail}`
        }
      }),
      cache: "no-store",
    });

    if (!shopifyRes.ok) return publicCoupons;

    const shopifyData = await shopifyRes.json();
    const customerEdge = shopifyData?.data?.customers?.edges?.[0];
    
    // If customer doesn't exist yet, or exists and has 0 orders, they are a first-time buyer
    const ordersCount = customerEdge ? parseInt(customerEdge.node.ordersCount, 10) : 0;

    if (ordersCount === 0) {
      return [
        { code: "WELCOME10", description: "10% off your first order!", discount: 10, isFirstTime: true },
        ...publicCoupons
      ];
    }

    return publicCoupons;
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return publicCoupons;
  }
}

export interface ProductOffer {
  code: string;
  description: string;
  type: 'global' | 'specific' | 'new_user';
}

export async function getProductOffers(productId: string, productTags: string[] = [], collections: string[] = [], customerEmail?: string): Promise<ProductOffer[]> {
  const offers: ProductOffer[] = [];

  // 1. Universal Coupons
  offers.push({ code: 'FREESHIP', description: 'Free shipping on all orders', type: 'global' });
  offers.push({ code: 'SAVE10', description: 'Save 10% on your order', type: 'global' });

  // 2. First-Time Buyer Logic
  let isFirstTime = false;
  if (!customerEmail) {
    // If guest, assume first time for prompt purposes
    isFirstTime = true;
  } else {
    try {
      const domain = process.env.SHOPIFY_STORE_DOMAIN;
      const clientId = process.env.SHOPIFY_CLIENT_ID;
      const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

      if (domain && clientId && clientSecret) {
        const authRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "client_credentials"
          }),
          cache: "no-store"
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          const adminToken = authData.access_token;
          
          if (adminToken) {
            const query = `
              query getCustomerOrders($query: String!) {
                customers(first: 1, query: $query) {
                  edges {
                    node {
                      ordersCount
                    }
                  }
                }
              }
            `;

            const shopifyRes = await fetch(`https://${domain}/admin/api/2024-01/graphql.json`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": adminToken,
              },
              body: JSON.stringify({
                query,
                variables: { query: `email:${customerEmail}` }
              }),
              cache: "no-store",
            });

            if (shopifyRes.ok) {
              const shopifyData = await shopifyRes.json();
              const customerEdge = shopifyData?.data?.customers?.edges?.[0];
              const ordersCount = customerEdge ? parseInt(customerEdge.node.ordersCount, 10) : 0;
              if (ordersCount === 0) isFirstTime = true;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking customer history:", error);
      isFirstTime = true; // Fallback to showing it just in case
    }
  }

  if (isFirstTime) {
    offers.push({ code: 'WELCOME10', description: '10% off your first order!', type: 'new_user' });
  }

  // 3. Conditional / Product-Specific Coupons
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

/**
 * Cancels a Shopify order using a temporary access token obtained via Client Credentials Grant.
 */
export async function cancelShopifyOrder(orderId: string, customerId: string) {
  try {
    const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!domain || !clientId || !clientSecret) {
      console.error("Missing Shopify OAuth Configuration:", { domain, hasClientId: !!clientId, hasSecret: !!clientSecret });
      return { success: false, error: "Server configuration missing" };
    }

    // Step A: Get Temporary Access Token via Client Credentials Grant
    const authRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      }),
      cache: "no-store"
    });

    if (!authRes.ok) {
      const errorText = await authRes.text();
      console.error("Shopify OAuth Error:", errorText);
      return { success: false, error: "Failed to authenticate with Shopify" };
    }

    const authData = await authRes.json();
    const tempAccessToken = authData.access_token;

    if (!tempAccessToken) {
      return { success: false, error: "Invalid OAuth response from Shopify" };
    }

    // Sanitize IDs
    const cleanOrderId = orderId.split("?")[0].replace(/\D/g, "");
    const cleanCustomerId = customerId.split("?")[0].replace(/\D/g, "");

    console.log("Cancelling Order:", { cleanOrderId, cleanCustomerId, domain });

    // Step B: Verify Order Eligibility and Ownership
    const cookieStore = await cookies();
    const token = cookieStore.get("customerAccessToken")?.value;

    if (!token) {
      return { success: false, error: "Authentication required to cancel orders." };
    }

    // Get actual customer from session to verify ownership
    const sessionCustomer = await getCustomer(token, "no-store");
    if (!sessionCustomer) {
      return { success: false, error: "Invalid session. Please log in again." };
    }

    const response = await fetch(
      `https://${domain}/admin/api/2024-04/orders/${cleanOrderId}.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": tempAccessToken,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Order Lookup Failed:", { status: response.status, errorText });
      return { success: false, error: `Order not found or inaccessible (${response.status})` };
    }

    const { order } = await response.json();

    // Verify Ownership (Standardizing both IDs to numeric strings)
    const orderCustomerId = order.customer?.id?.toString().replace(/\D/g, "");
    const sessionCustomerId = sessionCustomer.id.toString().replace(/\D/g, "");
    
    console.log("Ownership Verification:", { 
      orderId: cleanOrderId,
      orderCustomerId, 
      sessionCustomerId,
      match: orderCustomerId === sessionCustomerId
    });
    
    if (!orderCustomerId || orderCustomerId !== sessionCustomerId) {
      return { success: false, error: "Unauthorized: You do not own this order" };
    }

    // Verify Eligibility
    if (order.fulfillment_status === "fulfilled") {
      return { success: false, error: "Order has already been shipped and cannot be cancelled" };
    }

    if (order.cancelled_at) {
      return { success: false, error: "Order is already cancelled" };
    }

    // Step C: Execute Cancellation
    console.log("Executing Shopify Cancellation Request...");
    const cancelResponse = await fetch(
      `https://${domain}/admin/api/2024-04/orders/${cleanOrderId}/cancel.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": tempAccessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "customer",
          note: "Cancelled by customer through storefront."
        })
      }
    );

    if (!cancelResponse.ok) {
      const cancelError = await cancelResponse.json();
      console.error("Shopify Cancel API Error:", cancelError);
      return { success: false, error: cancelError.errors || "Failed to cancel order" };
    }

    console.log("Order Cancelled Successfully in Shopify");

    // Step D: Clear Cache for Instant UI Updates
    revalidatePath("/orders");
    const orderName = order.name?.replace("#", "");
    if (orderName) {
      revalidatePath(`/orders/${orderName}`);
    }
    // Also revalidate the generic [id] path just in case
    revalidatePath(`/orders/[id]`, 'page');

    return { success: true, message: "Order cancelled successfully" };

  } catch (error: any) {
    console.error("Cancel Order Action Exception:", error);
    return { success: false, error: `Server Exception: ${error.message || "Unknown error"}` };
  }
}

export async function getGuestOrderAction(orderName: string, email: string) {
  try {
    const adminToken = await getAdminToken();
    const domain = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

    if (!adminToken || !domain) {
      return { success: false, error: "Server configuration missing" };
    }

    const cleanOrderName = orderName.trim().replace(/^#/, "");
    const searchQuery = `name:${cleanOrderName} OR name:#${cleanOrderName}`;

    const shopifyQuery = `
      query getOrderDetails($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              email
              processedAt
              cancelledAt
              displayFulfillmentStatus
              displayFinancialStatus
              subtotalPriceSet {
                shopMoney {
                  amount
                }
              }
              totalPriceSet {
                shopMoney {
                  amount
                }
              }
              totalShippingPriceSet {
                shopMoney {
                  amount
                }
              }
              totalDiscountsSet {
                shopMoney {
                  amount
                }
              }
              shippingAddress {
                firstName
                lastName
                address1
                address2
                city
                province
                zip
                phone
              }
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    quantity
                    originalTotalSet {
                      shopMoney {
                        amount
                      }
                    }
                    variant {
                      title
                      price
                      compareAtPrice
                      image {
                        url
                      }
                      product {
                        handle
                      }
                    }
                  }
                }
              }
              metafields(first: 5) {
                edges {
                  node {
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
      body: JSON.stringify({
        query: shopifyQuery,
        variables: { query: searchQuery }
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      return { success: false, error: `Failed to query Shopify order: ${response.status}` };
    }

    const resJson = await response.json();
    const node = resJson.data?.orders?.edges?.[0]?.node;

    if (!node) {
      return { success: false, error: "Order not found" };
    }

    // Validate email case-insensitively
    if (!node.email || node.email.toLowerCase() !== email.trim().toLowerCase()) {
      return { success: false, error: "Access Denied: Email address does not match this order" };
    }

    // Map fields to storefront structure expected by OrderDetailsComponent
    const mappedOrder = {
      id: node.id,
      name: node.name,
      email: node.email,
      processedAt: node.processedAt,
      cancelledAt: node.cancelledAt,
      fulfillmentStatus: node.displayFulfillmentStatus,
      financialStatus: node.displayFinancialStatus,
      subtotalPrice: { amount: node.subtotalPriceSet?.shopMoney?.amount || "0" },
      totalPrice: { amount: node.totalPriceSet?.shopMoney?.amount || "0" },
      totalShipping: node.totalShippingPriceSet?.shopMoney?.amount || "0",
      totalDiscounts: node.totalDiscountsSet?.shopMoney?.amount || "0",
      shippingAddress: node.shippingAddress,
      lineItems: {
        edges: node.lineItems?.edges?.map((edge: any) => ({
          node: {
            title: edge.node.title,
            quantity: edge.node.quantity,
            originalTotalPrice: { amount: edge.node.originalTotalSet?.shopMoney?.amount || "0" },
            variant: edge.node.variant ? {
              title: edge.node.variant.title,
              price: { amount: edge.node.variant.price || "0" },
              compareAtPrice: edge.node.variant.compareAtPrice ? { amount: edge.node.variant.compareAtPrice } : null,
              image: edge.node.variant.image,
              product: edge.node.variant.product
            } : null
          }
        })) || []
      },
      metafields: node.metafields?.edges?.map((edge: any) => ({
        key: edge.node.key,
        value: edge.node.value
      })) || []
    };

    return { success: true, order: mappedOrder };
  } catch (error: any) {
    console.error("getGuestOrderAction Error:", error);
    return { success: false, error: `Server Exception: ${error.message || "Unknown error"}` };
  }
}

export async function getProductAction(handle: string) {
  try {
    const { getProduct } = await import("@/lib/shopify/products");
    const shopifyProduct = await getProduct(handle);
    if (!shopifyProduct) return null;
    
    const { normalizeProduct, toStoreProduct } = await import("@/lib/transformers");
    const normalized = normalizeProduct(shopifyProduct);
    normalized.isFull = true;
    return toStoreProduct(normalized);
  } catch (error) {
    console.error("Error in getProductAction:", error);
    return null;
  }
}

