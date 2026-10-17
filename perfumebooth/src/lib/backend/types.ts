export type ApiResponse<T> = {
  status: number;
  body: T;
  error?: string;
};

export type Edge<T> = {
  node: T;
};

export interface Product {
  rating_count: any;
  rating: any;
  id: string;
  handle: string;
  title: string;
  description: string;
  availableForSale: boolean;
  vendor: string;
  tags?: string[];
  productType: string;
  category?: string;
  gender?: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  compareAtPriceRange?: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  featuredImage?: {
    url: string;
    altText?: string;
  };
  images: {
    edges: { node: { url: string; altText?: string } }[];
    nodes?: { url: string; altText?: string }[];
  };
  metafields: { key: string; value: string }[];
  variants?: {
    id: string;
    title: string;
    price: string;
    compareAtPrice?: string;
    availableForSale: boolean;
    quantityAvailable: number;
    requiresShipping: boolean;
  }[];
}

export interface Collection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image?: {
    url: string;
    altText?: string;
  };
  products: {
    edges: Edge<Product>[];
    pageInfo?: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    filters?: any[];
  };
}

export interface Article {
  id: string;
  title: string;
  handle: string;
  excerpt: string;
  publishedAt: string;
  content: string;
  contentHtml: string;
  image?: {
    url: string;
    altText?: string;
  };
  authorV2?: {
    name: string;
  };
  tags?: string[];
}

export interface BlogData {
  title: string;
  articles: Article[];
}

export interface PageData {
  title: string;
  body: string;
}

/**
 * Unwraps standardized API response envelope: { data: ..., meta: { request_id: ... } }
 * If the payload is already unwrapped (raw), it returns it as-is.
 */
export function unwrapApiData<T = any>(payload: any): T {
  if (payload && typeof payload === 'object' && 'data' in payload && 'meta' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

/**
 * Ensures an array is returned from an API response, unwrapping any standard envelopes
 * or DRF { results: [...] } pagination containers, and falling back safely to [].
 */
export function ensureArray<T = any>(payload: any): T[] {
  const unwrapped = unwrapApiData(payload);
  if (Array.isArray(unwrapped)) {
    return unwrapped as T[];
  }
  if (unwrapped && typeof unwrapped === 'object' && Array.isArray((unwrapped as any).results)) {
    return (unwrapped as any).results as T[];
  }
  return [];
}
