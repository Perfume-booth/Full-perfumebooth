"use server";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

const isDocker = process.env.WATCHPACK_POLLING === "true";
const BACKEND_URL = process.env.BACKEND_API_URL || (isDocker ? "http://django:8000" : "http://localhost:8000");

// Helper to set token cookies
async function setAuthCookies(accessToken: string, refreshToken: string) {
  try {
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
  } catch {
    // Next.js throws when modifying cookies during Server Component rendering (RSC).
    // In Server Actions or Route Handlers, this succeeds.
  }
}

// Helper to refresh token silently if access token is expired
export async function refreshAccessToken() {
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
      const raw = await res.json();
      const data = raw.data || raw;
      const newAccess = data.access;
      const newRefresh = data.refresh || refreshToken;
      if (newAccess) {
        await setAuthCookies(newAccess, newRefresh);
        return newAccess;
      }
    }
  } catch (e) {
    console.error("Failed to silently refresh access token:", e);
  }

  // Clear cookies if refresh fails
  try {
    cookieStore.delete("customerAccessToken");
    cookieStore.delete("customerRefreshToken");
    cookieStore.delete("isLoggedIn");
  } catch {
    // Ignore in RSC
  }
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

    const raw = await res.json();
    const data = raw.data || raw;

    if (!res.ok) {
      return { error: data.detail || (raw.error && raw.error.message) || "Invalid credentials." };
    }

    const access = data.access;
    const refresh = data.refresh;
    if (!access || !refresh) {
      return { error: "Authentication response malformed. Please try again." };
    }

    await setAuthCookies(access, refresh);
    const finalRedirect = returnUrl && returnUrl !== "/" ? returnUrl : "/account";
    return { success: true, redirectUrl: finalRedirect };
  } catch {
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

    const raw = await res.json();
    const data = raw.data || raw;

    if (!res.ok) {
      return { error: data.detail || (raw.error && raw.error.message) || "Registration failed." };
    }

    const access = data.access;
    const refresh = data.refresh;
    if (access && refresh) {
      await setAuthCookies(access, refresh);
    }
    const finalRedirect = returnUrl && returnUrl !== "/" ? returnUrl : "/account";
    return { success: true, redirectUrl: finalRedirect };
  } catch {
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
  } catch {
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

    const raw = await res.json();
    const data = raw.data || raw;

    if (!res.ok) {
      return { error: data.detail || (raw.error && raw.error.message) || "Invalid or expired OTP." };
    }

    const access = data.access;
    const refresh = data.refresh;
    if (access && refresh) {
      await setAuthCookies(access, refresh);
    }
    const finalRedirect = returnUrl && returnUrl !== "/" ? returnUrl : "/account";
    return { success: true, redirectUrl: finalRedirect };
  } catch {
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

    const raw = await res.json();
    const data = raw.data || raw;

    if (!res.ok) {
      return { error: data.detail || (raw.error && raw.error.message) || `Social authentication failed with ${provider}.` };
    }

    const access = data.access;
    const refresh = data.refresh;
    if (access && refresh) {
      await setAuthCookies(access, refresh);
    }
    const finalRedirect = returnUrl && returnUrl !== "/" ? returnUrl : "/account";
    return { success: true, redirectUrl: finalRedirect };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  let token = cookieStore.get("customerAccessToken")?.value;

  if (!token) {
    token = (await refreshAccessToken()) || undefined;
  }

  return !!token;
}

export const requireCustomer = cache(async () => {
  const cookieStore = await cookies();
  let token = cookieStore.get("customerAccessToken")?.value;

  if (!token) {
    token = (await refreshAccessToken()) || undefined;
  }

  if (!token) {
    redirect("/auth?returnUrl=/account");
  }

  try {
    let res = await fetch(`${BACKEND_URL}/api/auth/customer/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // If access token expired on backend (401), try refresh once
    if (res.status === 401) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        token = refreshedToken;
        res = await fetch(`${BACKEND_URL}/api/auth/customer/me/`, {
          headers: { Authorization: `Bearer ${refreshedToken}` },
        });
      }
    }

    if (res.ok) {
      const raw = await res.json();
      const user = raw.data || raw;
      return {
        id: user.id,
        firstName: user.first_name || "Customer",
        lastName: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        createdAt: user.created_at || new Date().toISOString(),
        tags: user.tags || [],
        gender: { value: user.gender || "" },
        addresses: {
          edges: (user.addresses || []).map((addr: any) => ({
            node: {
              id: addr.id,
              firstName: addr.first_name || user.first_name || "",
              lastName: addr.last_name || user.last_name || "",
              address1: addr.address1 || "",
              address2: addr.address2 || "",
              city: addr.city || "",
              province: addr.province || addr.state || "",
              country: addr.country || "India",
              zip: addr.zip || addr.postal_code || "",
              phone: addr.phone || user.phone || "",
              isDefault: addr.is_default || false,
            },
          })),
        },
        orders: {
          edges: (user.orders || []).map((ord: any) => ({
            node: ord,
          })),
        },
      };
    }
  } catch (e) {
    console.error("Error fetching customer profile:", e);
  }

  redirect("/auth?returnUrl=/account");
});

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) {
    return { error: "Email is required." };
  }

  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
    const proto = headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

    const res = await fetch(`${BACKEND_URL}/api/auth/customer/password-reset/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, frontend_url: siteUrl }),
    });

    const raw = await res.json();
    const data = raw.data || raw;
    if (!res.ok) {
      return { error: raw.error?.message || raw.detail || data.detail || "Failed to process request." };
    }

    return { 
      success: data.detail || "Verification code sent to your email.",
      email,
      otpSent: true,
      smtpWarning: data.smtp_warning || null
    };
  } catch {
    return { error: "Network error. Please try again later." };
  }
}

export async function verifyEmailOtpAndResetAction(prevState: any, formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const otp = (formData.get("otp") as string)?.trim();
  const password = formData.get("password") as string;
  const returnUrl = (formData.get("returnUrl") as string) || "/account";

  if (!email || !otp || !password) {
    return { error: "Email, 6-digit verification code, and new password are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/customer/password-reset-confirm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, password }),
    });

    const raw = await res.json();
    const data = raw.data || raw;
    if (!res.ok) {
      return { error: raw.error?.message || raw.detail || data.detail || "Verification failed." };
    }

    const access = data.access || raw.access;
    const refresh = data.refresh || raw.refresh;

    if (access && refresh) {
      await setAuthCookies(access, refresh);
      return { success: true, redirectUrl: returnUrl };
    }

    return { 
      success: data.detail || "Your password has been successfully reset.",
      redirectUrl: "/auth?mode=signin"
    };
  } catch {
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
  } catch {
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
  } catch {
    return { error: "Network error. Please try again later." };
  }
}

