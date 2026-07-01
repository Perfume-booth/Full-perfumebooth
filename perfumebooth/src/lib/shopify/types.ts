export type ShopifyResponse<T> = {
  status: number;
  body: T;
  error?: string;
};

export type Edge<T> = {
  node: T;
};

export interface ShopifyProduct {
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
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image?: {
    url: string;
    altText?: string;
  };
  products: {
    edges: Edge<ShopifyProduct>[];
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
  image?: {
    url: string;
    altText?: string;
  };
  authorV2?: {
    name: string;
  };
}

export interface BlogData {
  title: string;
  articles: Article[];
}

export interface PageData {
  title: string;
  body: string;
}
