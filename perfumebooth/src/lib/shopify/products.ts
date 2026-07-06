import { ShopifyProduct } from './types';

// Central mapping utility from Django model payload to legacy ShopifyProduct type
const isServer = typeof window === 'undefined';
const API_URL = isServer ? 'http://django:8000' : 'http://localhost:8000';

function cleanImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace('http://django:8000', '').replace('http://localhost:8000', '');
}

export function mapDjangoProductToShopifyProduct(p: any): ShopifyProduct {
  const images = p.images?.map((img: any) => ({
    url: cleanImageUrl(img.url) || '',
    altText: img.altText || p.title
  })) || [];

  const priceVal = parseFloat(p.price || "0").toFixed(2);
  const comparePriceVal = p.compare_at_price ? parseFloat(p.compare_at_price).toFixed(2) : undefined;

  return {
    id: String(p.id),
    handle: p.slug,
    title: p.title,
    description: p.description || '',
    availableForSale: p.is_online && (p.stock_count > 0 || p.stock > 0),
    vendor: p.vendor || p.brand || 'Perfume Booth',
    tags: p.tags || [],
    productType: p.productType || p.category || '',
    priceRange: {
      minVariantPrice: { amount: priceVal, currencyCode: "INR" }
    },
    compareAtPriceRange: comparePriceVal ? {
      minVariantPrice: { amount: comparePriceVal, currencyCode: "INR" }
    } : undefined,
    featuredImage: images.length > 0 ? images[0] : (p.image ? { url: cleanImageUrl(p.image) || '', altText: p.title } : undefined),
    images: {
      edges: images.map((img: any) => ({ node: img })),
      nodes: images
    },
    rating: p.rating || 0,
    rating_count: p.rating_count || 0,
    metafields: [
      { key: "tagline", value: p.tagline || "" },
      { key: "top_notes", value: p.top_notes || "" },
      { key: "middle_notes", value: p.middle_notes || "" },
      { key: "base_notes", value: p.base_notes || "" },
      { key: "longevity", value: p.longevity || "" },
      { key: "sillage", value: p.sillage || "" },
      { key: "size", value: String(p.size_ml || 100) },
      { key: "ingredients", value: p.ingredients || "" },
      { key: "whats_inside", value: JSON.stringify(p.whats_inside || []) },
      { key: "gender", value: p.gender || "Unisex" },
      { key: "season", value: p.season || "" },
      { key: "occasion", value: p.occasion || "" },
      { key: "concentration", value: p.concentration || "" },
      { key: "origin_country", value: p.origin_country || "India" },
    ]
  };
}

export async function getProducts(first: number = 30): Promise<ShopifyProduct[]> {
  try {
    const res = await fetch(`${API_URL}/api/shop/products/`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(mapDjangoProductToShopifyProduct).slice(0, first);
  } catch (err) {
    console.error("Error in getProducts:", err);
    return [];
  }
}

export async function getProduct(handle: string): Promise<ShopifyProduct | null> {
  if (!handle) return null;
  try {
    const res = await fetch(`${API_URL}/api/shop/products/${handle}/`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return mapDjangoProductToShopifyProduct(data);
  } catch (err) {
    console.error("Error in getProduct:", err);
    return null;
  }
}

export async function getProductRecommendations(productId: string): Promise<ShopifyProduct[]> {
  const products = await getProducts(10);
  return products.filter((p) => p.id !== productId);
}

export async function getBestSellingProducts(first: number = 30): Promise<ShopifyProduct[]> {
  return getProducts(first);
}

export async function getBrands(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/api/shop/brands/`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Error fetching brands:", err);
    return [];
  }
}

export interface FacetItem {
  value: string;
  count: number;
}

export interface Facets {
  genders: FacetItem[];
  brands: FacetItem[];
  categories: FacetItem[];
  productTypes: FacetItem[];
  occasions: FacetItem[];
  seasons: FacetItem[];
  tags: string[];
}

export async function getFacets(): Promise<Facets | null> {
  try {
    const res = await fetch(`${API_URL}/api/shop/facets/`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Error fetching facets:", err);
    return null;
  }
}

export async function getProductTypes(): Promise<string[]> {
  const facets = await getFacets();
  if (facets) {
    return facets.productTypes.map(f => f.value);
  }
  const products = await getProducts(200);
  const types = products.map(p => p.productType).filter(Boolean);
  return [...new Set<string>(types)];
}

export async function searchProducts(
  query: string,
  first: number = 30,
  sortKey: string = "RELEVANCE",
  reverse: boolean = false
): Promise<{ totalCount: number; products: ShopifyProduct[] }> {
  const allProducts = await getProducts(200);
  
  let products = allProducts;
  if (query && query !== "*") {
    const term = query.toLowerCase();
    products = allProducts.filter(p => 
      p.title.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.vendor.toLowerCase().includes(term) ||
      p.tags?.some(t => t.toLowerCase().includes(term))
    );
  }

  if (sortKey === "PRICE") {
    products.sort((a, b) => parseFloat(a.priceRange.minVariantPrice.amount) - parseFloat(b.priceRange.minVariantPrice.amount));
  }
  if (reverse) {
    products.reverse();
  }

  return {
    totalCount: products.length,
    products: products.slice(0, first)
  };
}
