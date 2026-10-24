"use server";

import { cookies } from "next/headers";
import { getCustomer } from "@/lib/catalog";

const isDocker = process.env.WATCHPACK_POLLING === "true";
const API_URL = isDocker ? "http://django:8000" : "http://localhost:8000";

export async function checkNewsletterSubscriptionAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("customerAccessToken")?.value;
    if (!token) {
      return { isSubscribed: false, hasOrders: false, success: true };
    }

    const customer = await getCustomer(token);
    if (!customer?.email) {
      return { isSubscribed: false, hasOrders: false, success: true };
    }

    const res = await fetch(`${API_URL}/api/cms/newsletter/status/?email=${encodeURIComponent(customer.email)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return { isSubscribed: false, hasOrders: false, success: true };
    }

    const raw = await res.json();
    const data = raw?.data ?? raw;
    return {
      isSubscribed: Boolean(data.isSubscribed),
      hasOrders: Boolean(data.hasOrders),
      success: true,
    };
  } catch (error) {
    console.error("checkNewsletterSubscriptionAction error:", error);
    return { isSubscribed: false, hasOrders: false, success: true };
  }
}
