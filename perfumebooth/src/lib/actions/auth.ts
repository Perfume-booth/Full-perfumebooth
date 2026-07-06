"use server";

import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

// Mock customer data for storefront demonstration/testing without Shopify
const MOCK_CUSTOMER = {
  id: "gid://shopify/Customer/123456789",
  firstName: "Guest",
  lastName: "User",
  email: "guest@example.com",
  createdAt: new Date().toISOString(),
  phone: "+919999999999",
  tags: ["gender_men"],
  gender: { value: "men" },
  addresses: {
    edges: [
      {
        node: {
          id: "gid://shopify/MailingAddress/123",
          firstName: "Guest",
          lastName: "User",
          address1: "123 Perfume Lane",
          address2: "Suite 400",
          city: "New Delhi",
          province: "Delhi",
          zip: "110001",
          country: "India",
          phone: "9999999999"
        }
      }
    ]
  },
  orders: {
    edges: []
  }
};

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const returnUrl = formData.get("returnUrl") as string || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const cookieStore = await cookies();
  cookieStore.set("customerAccessToken", "mock-token-123456", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  cookieStore.set("isLoggedIn", "true", {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  return { success: true, redirectUrl: returnUrl };
}

export async function registerAction(prevState: any, formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const returnUrl = formData.get("returnUrl") as string || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const cookieStore = await cookies();
  cookieStore.set("customerAccessToken", "mock-token-123456", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  cookieStore.set("isLoggedIn", "true", {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  const finalRedirect = returnUrl !== "/" ? returnUrl : "/account";
  return { success: true, redirectUrl: finalRedirect };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("customerAccessToken");
  cookieStore.delete("isLoggedIn");
  return { success: true, redirectUrl: "/" };
}

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) {
    return { error: "Email is required." };
  }
  return { success: "If an account exists with that email, a recovery link has been sent." };
}

export async function resetPasswordAction(prevState: any, formData: FormData) {
  const password = formData.get("password") as string;
  if (!password) {
    return { error: "Password is required." };
  }
  return { success: "Password successfully reset! You are now logged in.", redirectUrl: "/account" };
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("customerAccessToken")?.value;
  return !!token;
}

export const requireCustomer = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("customerAccessToken")?.value;

  if (!token) {
    redirect("/auth?returnUrl=/account");
  }

  return MOCK_CUSTOMER;
});
