"use server";

import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

const isDocker = process.env.WATCHPACK_POLLING === "true";
const BACKEND_URL = process.env.BACKEND_API_URL || (isDocker ? "http://django:8000" : "http://localhost:8000");

// Helper to set token cookies
async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  
  // Access Token Cookie (15 mins duration - can be shorter but we sync with backend simplejwt)
  cookieStore.set("customerAccessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
  });

  // Refresh Token Cookie (30 days duration)
  cookieStore.set("customerRefreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  cookieStore.set("isLoggedIn", "true", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
}

// Helper to refresh token silently if access token is expired
async function refreshAccessToken() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("customerRefreshToken")?.value;

  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      await setAuthCookies(data.access, data.refresh || refreshToken);
      return data.access;
    }
  } catch (e) {
    console.error("Failed to silently refresh access token:", e);
  }

  // Clear cookies if refresh fails
  cookieStore.delete("customerAccessToken");
  cookieStore.delete("customerRefreshToken");
  cookieStore.delete("isLoggedIn");
  return null;
}

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const returnUrl = (formData.get("returnUrl") as string) || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.detail || "Invalid credentials." };
    }

    await setAuthCookies(data.access, data.refresh);
    return { success: true, redirectUrl: returnUrl };
  } catch (e) {
    return { error: "Network error. Please try again later." };
  }
}

export async function registerAction(prevState: any, formData: FormData) {
  const name = formData.get("name") as string || "";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const phone = formData.get("phone") as string || "";
  const returnUrl = (formData.get("returnUrl") as string) || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const [firstName, ...lastNames] = name.split(" ");
  const lastName = lastNames.join(" ") || "Customer";

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.detail || "Registration failed." };
    }

    await setAuthCookies(data.access, data.refresh);
    const finalRedirect = returnUrl !== "/" ? returnUrl : "/account";
    return { success: true, redirectUrl: finalRedirect };
  } catch (e) {
    return { error: "Network error. Please try again later." };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("customerAccessToken")?.value;
  try {
    if (token) {
      const res = await fetch(`${BACKEND_URL}/api/auth/logout/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        return { error: "Logout failed on server. Please try again." };
      }
    }
  } catch (e) {
    console.error("Logout network error:", e);
    return { error: "Network error during logout. Please retry." };
  }
  cookieStore.delete("customerAccessToken");
  cookieStore.delete("customerRefreshToken");
  cookieStore.delete("isLoggedIn");
  return { success: true, redirectUrl: "/" };
}

export async function sendOtpAction(phone: string) {
  if (!phone) {
    return { error: "Phone number is required." };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/otp/send/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.detail || "Failed to send OTP." };
    }

    return { success: true };
  } catch (e) {
    return { error: "Network error. Please try again." };
  }
}

export async function verifyOtpAction(phone: string, code: string, returnUrl: string = "/") {
  if (!phone || !code) {
    return { error: "Phone number and OTP code are required." };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/otp/verify/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.detail || "Invalid or expired OTP." };
    }

    await setAuthCookies(data.access, data.refresh);
    return { success: true, redirectUrl: returnUrl };
  } catch (e) {
    return { error: "Network error. Please try again." };
  }
}

export async function socialAuthAction(provider: string, token: string, returnUrl: string = "/") {
  if (!provider || !token) {
    return { error: "Provider and token are required." };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/social/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, token }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.detail || `Social authentication failed with ${provider}.` };
    }

    await setAuthCookies(data.access, data.refresh);
    return { success: true, redirectUrl: returnUrl };
  } catch (e) {
    return { error: "Network error. Please try again." };
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  let token = cookieStore.get("customerAccessToken")?.value;

  if (!token) {
    token = await refreshAccessToken();
  }

  return !!token;
}

export const requireCustomer = cache(async () => {
  const cookieStore = await cookies();
  let token = cookieStore.get("customerAccessToken")?.value;

  if (!token) {
    token = await refreshAccessToken();
  }

  if (!token) {
    redirect("/auth?returnUrl=/account");
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const user = await res.json();
      return {
        id: user.id,
        firstName: user.first_name || "Customer",
        lastName: user.last_name || "",
        email: user.email,
        phone: user.phone,
        createdAt: new Date().toISOString(),
        tags: user.tags || [],
        gender: { value: user.gender || "" },
        addresses: { edges: [] },
        orders: { edges: [] },
      };
    }
  } catch (e) {
    console.error("Error fetching customer profile:", e);
  }

  redirect("/auth?returnUrl=/account");
});

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) {
    return { error: "Email is required." };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/password-reset/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.detail || "Failed to process request." };
    }

    return { success: data.detail || "If an account exists with that email, a recovery link has been sent." };
  } catch (e) {
    return { error: "Network error. Please try again later." };
  }
}

export async function resetPasswordAction(prevState: any, formData: FormData) {
  const id = formData.get("id") as string;
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!id || !token || !password) {
    return { error: "Invalid request. Missing reset token or password." };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/password-reset-confirm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: id, token, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.detail || "Password reset failed." };
    }

    return { 
      success: data.detail || "Your password has been successfully reset.",
      redirectUrl: "/auth?mode=signin"
    };
  } catch (e) {
    return { error: "Network error. Please try again later." };
  }
}

export async function changePasswordAction(oldPassword: string, newPassword: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("customerAccessToken")?.value;

  if (!token) {
    return { error: "You must be signed in to change your password." };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/change-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.detail || "Failed to change password." };
    }

    return { success: data.detail || "Password updated successfully." };
  } catch (e) {
    return { error: "Network error. Please try again later." };
  }
}

