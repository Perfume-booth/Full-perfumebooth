import { cleanDomain } from "./fetcher";

// In-memory token cache to prevent redundant OAuth token exchanges across requests in the same container session
let cachedToken: string | null = null;
let tokenExpiresAt: number | null = null;

interface TokenResponse {
  access_token: string;
  scope: string;
  expires_in?: number; // Some OAuth flows include expiration; Shopify token duration can vary
}

interface ShopifyAdminFetchOptions {
  query: string;
  variables?: Record<string, unknown>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  headers?: Record<string, string>;
}

interface ShopifyAdminResponse<T> {
  status: number;
  body: {
    data?: T;
    errors?: Array<{
      message: string;
      locations?: Array<{ line: number; column: number }>;
      path?: string[];
      extensions?: Record<string, unknown>;
    }>;
  };
  error?: string;
}

/**
 * Automatically authenticates using client_credentials grant type and retrieves
 * a short-lived access token.
 */
async function getAdminAccessToken(domain: string, clientId: string, clientSecret: string): Promise<string> {
  // If we have a cached token that isn't expired, return it immediately
  if (cachedToken && (!tokenExpiresAt || Date.now() < tokenExpiresAt)) {
    return cachedToken;
  }

  const tokenUrl = `https://${cleanDomain(domain)}/admin/oauth/access_token`;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PerfumeBooth-Headless-Admin/1.0",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      cache: "no-store", // Auth endpoints should never be cached by Next.js
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Auth exchange failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as TokenResponse;
    if (!data.access_token) {
      throw new Error("No access_token returned in OAuth response");
    }

    // Cache the token
    cachedToken = data.access_token;
    if (data.expires_in) {
      // Set expiration buffer of 60 seconds to prevent using a token on the edge of expiration
      tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    } else {
      tokenExpiresAt = null; // Shopify Admin access tokens are typically long-lived unless custom configured
    }

    return cachedToken;
  } catch (error: any) {
    console.error("[Shopify Admin Auth Error]:", error.message || error);
    throw error;
  }
}

/**
 * Reusable, server-side TypeScript utility function to execute GraphQL queries
 * against the Shopify Admin API with automated two-step authentication.
 */
export async function shopifyAdminFetch<T>({
  query,
  variables = {},
  cache = "no-store", // Admin queries represent fresh backend syncs, default to no-store
  next,
  headers = {},
}: ShopifyAdminFetchOptions): Promise<ShopifyAdminResponse<T>> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();

  if (!domain || !clientId || !clientSecret) {
    const missing = [];
    if (!domain) missing.push("SHOPIFY_STORE_DOMAIN");
    if (!clientId) missing.push("SHOPIFY_CLIENT_ID");
    if (!clientSecret) missing.push("SHOPIFY_CLIENT_SECRET");
    
    return {
      status: 400,
      body: {},
      error: `Missing Shopify Admin credentials in env variables: ${missing.join(", ")}`,
    };
  }

  const executeQuery = async (token: string): Promise<ShopifyAdminResponse<T>> => {
    const apiVersion = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || "2024-01";
    const endpoint = `https://${cleanDomain(domain)}/admin/api/${apiVersion}/graphql.json`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
        "User-Agent": "PerfumeBooth-Headless-Admin/1.0",
        ...headers,
      },
      body: JSON.stringify({ query, variables }),
      cache,
      ...(next && { next }),
    });

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      return {
        status: res.status,
        body: {},
        error: `Expected JSON response but received: ${text.slice(0, 200)}`,
      };
    }

    const body = await res.json();
    return { status: res.status, body };
  };

  try {
    // 1. Get access token (cached or fresh exchange)
    let token = await getAdminAccessToken(domain, clientId, clientSecret);

    // 2. Execute GraphQL query
    let result = await executeQuery(token);

    // 3. Resilient retry on 401 Unauthorized (in case cached token is expired/invalidated)
    if (result.status === 401) {
      console.warn("[Shopify Admin Fetch] Cached token returned 401 Unauthorized. Retrying with a fresh token...");
      cachedToken = null; // Clear invalid token
      tokenExpiresAt = null;
      
      token = await getAdminAccessToken(domain, clientId, clientSecret);
      result = await executeQuery(token);
    }

    return result;
  } catch (error: any) {
    console.error("[Shopify Admin Fetch Exception]:", error.message || error);
    return {
      status: 500,
      body: {},
      error: error.message || "An unexpected error occurred during Shopify Admin Fetch.",
    };
  }
}
