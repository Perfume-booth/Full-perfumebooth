import { Product, unwrapApiData, ensureArray } from './types';
import { cleanImageUrl, cleanCategoryName } from '../transformers';

const isServer = typeof window === 'undefined';
const isDocker = process.env.WATCHPACK_POLLING === "true";
const API_URL = isServer ? (isDocker ? 'http://django:8000' : 'http://localhost:8000') : 'http://localhost:8000';


export function mapDjangoProductToProduct(p: any): Product {
  if (!p) return {} as Product;

  const images = p.images?.map((img: any) => ({
    url: cleanImageUrl(img.url || img.image) || '',
    altText: img.altText || p.title
  })) || [];

  const mainImageUrl = cleanImageUrl(p.image);
  if (mainImageUrl) {
    const existingIdx = images.findIndex((img: any) => img.url === mainImageUrl);
    if (existingIdx > 0) {
      const [item] = images.splice(existingIdx, 1);
      images.unshift(item);
    } else if (existingIdx === -1) {
      images.unshift({
        url: mainImageUrl,
        altText: p.title
      });
    }
  }

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
    productType: cleanCategoryName(p.productType || p.category || ''),
    category: cleanCategoryName(p.category || p.attributes?.category || p.productType || ''),
    gender: p.gender || p.attributes?.gender || '',
    priceRange: {
      minVariantPrice: { amount: priceVal, currencyCode: "INR" }
    },
    compareAtPriceRange: comparePriceVal ? {
      minVariantPrice: { amount: comparePriceVal, currencyCode: "INR" }
    } : undefined,
    featuredImage: mainImageUrl ? { url: mainImageUrl, altText: p.title } : (images.length > 0 ? images[0] : undefined),
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
    ],
    variants: p.variants?.length ? p.variants.map((variant: any) => ({
      id: String(variant.id),
      title: variant.title || variant.option1_value || "Default Title",
      price: String(variant.price),
      compareAtPrice: variant.compare_at_price ? String(variant.compare_at_price) : undefined,
      availableForSale: Number(variant.stock_level) > 0,
      quantityAvailable: Number(variant.stock_level || 0),
      requiresShipping: true,
    })) : [{
      id: String(p.id), title: "Default Title", price: priceVal, compareAtPrice: comparePriceVal,
      availableForSale: p.is_online && (p.stock_count > 0 || p.stock > 0),
      quantityAvailable: p.stock_count || p.stock || 0, requiresShipping: true,
    }]
  };
}

export async function getProducts(first: number = 30): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/api/shop/products/`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const rawData = await res.json();
    const data = ensureArray(rawData);
    return data.map(mapDjangoProductToProduct).slice(0, first);
  } catch (err) {
    console.error("Error in getProducts:", err);
    return [];
  }
}

export async function getProduct(handle: string): Promise<Product | null> {
  if (!handle) return null;
  try {
    const res = await fetch(`${API_URL}/api/shop/products/${handle}/`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const rawData = await res.json();
    const data = unwrapApiData(rawData);
    if (!data || typeof data !== 'object') return null;
    return mapDjangoProductToProduct(data);
  } catch (err) {
    console.error("Error in getProduct:", err);
    return null;
  }
}

export async function getProductRecommendations(productId: string): Promise<Product[]> {
  const products = await getProducts(10);
  return products.filter((p) => p.id !== productId);
}

export async function getBestSellingProducts(first: number = 30): Promise<Product[]> {
  return getProducts(first);
}

export async function getBrands(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/api/shop/brands/`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const rawData = await res.json();
    return ensureArray<string>(rawData);
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
    const rawData = await res.json();
    const data = unwrapApiData<Facets>(rawData);
    if (!data || typeof data !== 'object') return null;
    return {
      genders: ensureArray(data.genders),
      brands: ensureArray(data.brands),
      categories: ensureArray(data.categories),
      productTypes: ensureArray(data.productTypes),
      occasions: ensureArray(data.occasions),
      seasons: ensureArray(data.seasons),
      tags: ensureArray(data.tags),
    };
  } catch (err) {
    console.error("Error fetching facets:", err);
    return null;
  }
}

export async function getProductTypes(): Promise<string[]> {
  const facets = await getFacets();
  if (facets && Array.isArray(facets.productTypes)) {
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
): Promise<{ totalCount: number; products: Product[] }> {
  try {
    const searchParam = query && query !== "*" ? `?search=${encodeURIComponent(query)}` : "";
    const res = await fetch(`${API_URL}/api/shop/products/${searchParam}`, {
      cache: 'no-store'
    });
    if (!res.ok) return { totalCount: 0, products: [] };
    const rawData = await res.json();
    const data = ensureArray(rawData);
    let products = data.map(mapDjangoProductToProduct);

    if (sortKey === "PRICE") {
      products.sort((a: { priceRange: { minVariantPrice: { amount: string; }; }; }, b: { priceRange: { minVariantPrice: { amount: string; }; }; }) => parseFloat(a.priceRange.minVariantPrice.amount) - parseFloat(b.priceRange.minVariantPrice.amount));
    }
    if (reverse) {
      products.reverse();
    }

    return {
      totalCount: products.length,
      products: products.slice(0, first)
    };
  } catch (err) {
    console.error("Error in searchProducts:", err);
    return { totalCount: 0, products: [] };
  }
}
