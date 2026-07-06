"use server";

export async function checkNewsletterSubscriptionAction() {
  return { isSubscribed: false, hasOrders: false, success: true };
}
