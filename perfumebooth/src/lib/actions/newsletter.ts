"use server";

import { cookies } from "next/headers";
import { getCustomer } from "@/lib/shopify";

export async function checkNewsletterSubscriptionAction() {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get("customerAccessToken")?.value;

    if (!token) {
      return { isSubscribed: false, success: false };
    }

    const customer = await getCustomer(token);
    
    if (!customer) {
      return { isSubscribed: false, success: false };
    }

    // Check the metafield we added to getCustomerQuery
    const isSubscribed = customer.is_subscribed?.value === "true";
    const hasOrders = (customer.orders?.edges?.length || 0) > 0;

    return { isSubscribed, hasOrders, success: true };
  } catch (error) {
    console.error("Check newsletter subscription error:", error);
    return { isSubscribed: false, success: false };
  }
}
