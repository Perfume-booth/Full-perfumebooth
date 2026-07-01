"use server";

import { cookies } from "next/headers";
import { 
  createAccessToken, 
  createCustomer, 
  deleteAccessToken, 
  recoverPassword,
  resetPassword,
  getCustomer
} from "@/lib/shopify";
import { cache } from "react";
import { redirect } from "next/navigation";
import { updateCartBuyerIdentityAction } from "./actions";
import { shopifyAdminFetch } from "@/lib/shopify/admin-fetcher";

async function checkCustomerStateAdmin(email: string): Promise<{ id: string; state: string } | null> {
  try {
    const res = await shopifyAdminFetch<any>({
      query: `
        query getCustomerByEmail($query: String!) {
          customers(first: 1, query: $query) {
            edges {
              node {
                id
                state
              }
            }
          }
        }
      `,
      variables: { query: `email:${email}` },
    });

    const node = res.body?.data?.customers?.edges?.[0]?.node;
    if (node) {
      return { id: node.id, state: node.state };
    }
  } catch (err) {
    console.error("Error checking customer state via Admin API:", err);
  }
  return null;
}

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const returnUrl = formData.get("returnUrl") as string || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const result = await createAccessToken({  email, password });

    if (result?.customerUserErrors?.length > 0) {
      const errorMsg = result.customerUserErrors[0].message;
      const errorCode = result.customerUserErrors[0].code;
      
      if (errorCode === "UNIDENTIFIED_CUSTOMER" || errorMsg === "Unidentified customer") {
        const adminCustomer = await checkCustomerStateAdmin(email);
        if (adminCustomer && (adminCustomer.state === "DISABLED" || adminCustomer.state === "INVITED")) {
          try {
            await recoverPassword(email);
          } catch (recoveryErr) {
            console.error("Failed to trigger recovery for disabled customer:", recoveryErr);
          }
          return { 
            error: "Your account is not yet activated (e.g. from guest checkout or import). We have sent an email link to set up your password and activate your account. Please check your inbox." 
          };
        }
      }
      return { error: errorMsg };
    }

    const accessToken = result?.customerAccessToken?.accessToken;
    const expiresAt = result?.customerAccessToken?.expiresAt;

    if (!accessToken) {
      return { error: "Failed to create access token." };
    }

    const cookieStore = await cookies();
    cookieStore.set("customerAccessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });

    cookieStore.set("isLoggedIn", "true", {
      httpOnly: false, // Accessible by client side scripts if needed for UI state
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });

    // Link active cart to the logged-in customer
    await updateCartBuyerIdentityAction(accessToken);

    return { success: true, redirectUrl: returnUrl };
  } catch (error: any) {
    if (error.message === "NEXT_REDIRECT") throw error;
    console.error("Login Action Error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
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

  try {
    const result = await createCustomer({
      firstName,
      lastName,
      email,
      password,
      acceptsMarketing: true,
    });

    if (result?.customerUserErrors?.length > 0) {
      const errorMsg = result.customerUserErrors[0].message;
      const errorCode = result.customerUserErrors[0].code;

      if (errorCode === "TAKEN" || errorMsg === "Email has already been taken") {
        const adminCustomer = await checkCustomerStateAdmin(email);
        if (adminCustomer && (adminCustomer.state === "DISABLED" || adminCustomer.state === "INVITED")) {
          try {
            await recoverPassword(email);
          } catch (recoveryErr) {
            console.error("Failed to trigger recovery for disabled customer on register:", recoveryErr);
          }
          return { 
            error: "An account with this email already exists (e.g. from guest checkout) but is not yet activated. We have sent an email link to set up your password and activate your account. Please check your inbox." 
          };
        }
      }
      return { error: errorMsg };
    }

    // ── AUTO-LOGIN AFTER SUCCESSFUL REGISTRATION ──
    // Automatically generate session access token so the customer doesn't have to manually log in again
    try {
      const loginResult = await createAccessToken({ email, password });
      
      if (loginResult?.customerAccessToken?.accessToken) {
        const accessToken = loginResult.customerAccessToken.accessToken;
        const expiresAt = loginResult.customerAccessToken.expiresAt;
        
        const cookieStore = await cookies();
        cookieStore.set("customerAccessToken", accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          expires: new Date(expiresAt),
        });

        cookieStore.set("isLoggedIn", "true", {
          httpOnly: false,
          secure: true,
          sameSite: "lax",
          path: "/",
          expires: new Date(expiresAt),
        });

        // Link active cart to the newly logged-in customer identity
        await updateCartBuyerIdentityAction(accessToken);
      }
    } catch (loginErr) {
      console.error("Auto-login failed after registration:", loginErr);
      // Fallback: even if auto-login fails, account creation succeeded, so proceed to redirect
    }

    const finalRedirect = returnUrl !== "/" ? returnUrl : "/account";
    return { success: true, redirectUrl: finalRedirect };
  } catch (error: any) {
    if (error.message === "NEXT_REDIRECT") throw error;
    console.error("Register Action Error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("customerAccessToken")?.value;

  if (token) {
    try {
      await deleteAccessToken(token);
    } catch (e) {
      console.error("Logout Delete Trace:", e);
    }
  }

  cookieStore.delete("customerAccessToken");
  cookieStore.delete("isLoggedIn");

  return { success: true, redirectUrl: "/" };
}

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required." };
  }

  try {
    const result = await recoverPassword(email);

    if (result?.customerUserErrors?.length > 0) {
      return { error: result.customerUserErrors[0].message };
    }
  } catch (error) {
    console.error("Forgot Password Action Error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }

  return { success: "If an account exists with that email, a recovery link has been sent." };
}

export async function resetPasswordAction(prevState: any, formData: FormData) {
  const id = formData.get("id") as string;
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!id || !token || !password) {
    return { error: "Missing required reset token or password." };
  }

  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim() || "perfumesbooth.myshopify.com";
  let cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Shopify Storefront API's customerResetByUrl mutation ONLY accepts the canonical '.myshopify.com' domain.
  // If the live environment variable is set to the custom domain (e.g. perfumebooth.com),
  // we must resolve it back to the canonical 'perfumesbooth.myshopify.com' domain to avoid "Invalid reset URL" errors.
  if (!cleanDomain.endsWith(".myshopify.com")) {
    cleanDomain = "perfumesbooth.myshopify.com";
  }

  const resetUrl = `https://${cleanDomain}/account/reset/${id}/${token}`;

  try {
    const result = await resetPassword(resetUrl, password);

    if (result?.customerUserErrors?.length > 0) {
      return { error: result.customerUserErrors[0].message };
    }

    const accessToken = result?.customerAccessToken?.accessToken;
    const expiresAt = result?.customerAccessToken?.expiresAt;

    if (accessToken && expiresAt) {
      const cookieStore = await cookies();
      cookieStore.set("customerAccessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        expires: new Date(expiresAt),
      });

      cookieStore.set("isLoggedIn", "true", {
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        path: "/",
        expires: new Date(expiresAt),
      });

      await updateCartBuyerIdentityAction(accessToken);
    }

    return { success: "Password successfully reset! You are now logged in.", redirectUrl: "/account" };
  } catch (error: any) {
    console.error("Reset Password Action Error:", error);
    return { error: error.message || "An unexpected error occurred while resetting your password. Please try again." };
  }
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("customerAccessToken")?.value;
    return !!token;
}

// Import moved to top of file

export const requireCustomer = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("customerAccessToken")?.value;

  if (!token) {
    redirect("/auth?returnUrl=/account");
  }

  const customer = await getCustomer(token);

  if (!customer) {
    redirect("/auth?returnUrl=/account");
  }

  let mergedCustomer = { ...customer };

  // Merge with freshest Admin API customer data to bypass Storefront CDN caches
  try {
    const adminRes = await shopifyAdminFetch<any>({
      query: `
        query getCustomerAdmin($id: ID!) {
          customer(id: $id) {
            tags
            gender: metafield(namespace: "custom", key: "gender") {
              value
            }
          }
        }
      `,
      variables: { id: customer.id },
    });

    if (adminRes?.body?.data?.customer) {
      const adminCustomer = adminRes.body.data.customer;
      mergedCustomer.tags = adminCustomer.tags || customer.tags || [];
      mergedCustomer.gender = adminCustomer.gender ? { value: adminCustomer.gender.value } : (customer.gender ? { value: customer.gender.value } : null);
    }
  } catch (err) {
    console.error("Failed to fetch fresh customer data from Admin API:", err);
  }

  return JSON.parse(JSON.stringify(mergedCustomer));
});
