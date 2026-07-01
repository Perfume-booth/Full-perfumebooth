import { ShopifyResponse } from './types';

export function cleanDomain(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function sanitizePolicyHtml(html: string): string {
  return html
    .replace(/\s*class="[^"]*"/g, "")
    .replace(/\s*style="[^"]*"/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function mapNodes<T>(edges: { node: T }[]): T[] {
  return edges.map((e) => e.node);
}

export async function shopifyFetch<T>({
  query,
  variables = {},
  retries = 3,
  cache,
  next,
}: {
  query: string;
  variables?: Record<string, unknown>;
  retries?: number;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}): Promise<ShopifyResponse<T>> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim() || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN?.trim();
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim() || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim();

  if (!domain || !storefrontAccessToken) {
    const missing = [];
    if (!domain) missing.push("SHOPIFY_STORE_DOMAIN");
    if (!storefrontAccessToken) missing.push("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
    throw new Error(`Missing Shopify env variables: ${missing.join(", ")}`);
  }

  const apiVersion = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2024-04';
  const endpoint = `https://${cleanDomain(domain)}/api/${apiVersion}/graphql.json`;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
          "User-Agent": "PerfumeBooth-NextJS/1.0",
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(15000), // 15s timeout
        ...(cache && { cache }),
        ...((!cache || cache !== "no-store") && !next ? { next: { revalidate: 900 } } : {}),
        ...(next ? { next } : {}),
      });



      if (!res.ok) {
        const errorText = await res.text();
        return { status: res.status, body: { data: {} } as T, error: errorText };
      }

      const body = await res.json();

      return { status: res.status, body };
    } catch (error: any) {
      if (error.message?.includes("Dynamic server usage") || error.digest?.includes("DYNAMIC_SERVER_USAGE")) {
        throw error;
      }

      attempt++;

      const isTransientError =
        error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('timeout') ||
        error.cause?.code === 'ECONNRESET';

      if (attempt <= retries && isTransientError) {
        const delay = attempt * 1000;
        console.warn(`[Shopify Fetch] Timeout/Network error. Retrying attempt ${attempt}/${retries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.error("--- Shopify Fetch Failure ---");
      console.error("Endpoint:", endpoint);
      console.error("Error Message:", error.message);

      return {
        status: 500,
        body: { data: {} } as T,
        error: error.message,
      };
    }
  }

  return {
    status: 500,
    body: { data: {} } as T,
    error: "Max retries reached"
  };
}
