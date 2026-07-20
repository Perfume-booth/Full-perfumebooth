import { Collection, Product } from './types';
import { getProducts, getFacets, mapDjangoProductToProduct } from './products';
import { cleanImageUrl } from '../transformers';

export interface CollectionProductsResult {
  title: string;
  description: string;
  bannerImage: string | null;
  products: any[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  filters: any[];
}

export async function getAllCollections(first: number = 250): Promise<Collection[]> {
  const isServer = typeof window === 'undefined';
  const isDocker = process.env.WATCHPACK_POLLING === "true";
  const API_URL = isServer ? (isDocker ? 'http://django:8000' : 'http://localhost:8000') : 'http://localhost:8000';

  try {
    const res = await fetch(`${API_URL}/api/shop/collections/`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return data.map((col: any) => ({
        id: col.id,
        handle: col.slug,
        title: col.title,
        description: col.description,
        image: col.image ? { url: cleanImageUrl(col.image) || '' } : undefined,
        products: { edges: [] }
      }));
    }
  } catch (err) {
    console.error("Error fetching all collections from API:", err);
  }

  const facets = await getFacets();
  
  // Build collections dynamically from facets
  const handles: string[] = ["all"];
  
  // Add gender collections
  if (facets) {
    facets.genders.forEach(g => {
      const slug = g.value.toLowerCase().replace(/\s+/g, '-');
      if (!handles.includes(slug)) handles.push(slug);
    });
    // Add category collections
    facets.categories.forEach(c => {
      const slug = c.value.toLowerCase().replace(/\s+/g, '-');
      if (!handles.includes(slug)) handles.push(slug);
    });
  }
  
  return handles.map(h => ({
    id: h,
    handle: h,
    title: h.charAt(0).toUpperCase() + h.slice(1).replace(/-/g, ' ') + " Fragrances",
    description: `Browse our exquisite ${h.replace(/-/g, ' ')} collection`,
    products: { edges: [] }
  }));
}

/**
 * Get a virtual or API collection by handle.
 * Uses structured attribute fields (gender, brand, category, productType) 
 * for matching instead of relying solely on tags.
 */
export async function getCollection(
  handle: string,
  first: number = 30,
  after?: string
): Promise<Collection | null> {
  if (!handle) return null;

  const isServer = typeof window === 'undefined';
  const isDocker = process.env.WATCHPACK_POLLING === "true";
  const API_URL = isServer ? (isDocker ? 'http://django:8000' : 'http://localhost:8000') : 'http://localhost:8000';

  // 1. Try to fetch from backend collections API first
  try {
    const res = await fetch(`${API_URL}/api/shop/collections/${handle}/`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      const shopifyProducts = data.products.map(mapDjangoProductToProduct);
      return {
        id: data.id,
        handle: data.slug,
        title: data.title,
        description: data.description,
        image: data.image ? { url: cleanImageUrl(data.image) || '' } : undefined,
        products: {
          edges: shopifyProducts.slice(0, first).map((p: any) => ({ node: p })),
          pageInfo: {
            hasNextPage: shopifyProducts.length > first,
            endCursor: null
          }
        }
      };

    }
  } catch (err) {
    console.error("Error fetching collection from backend API:", err);
  }

  // 2. Fallback to virtual collections
  const allProducts = await getProducts(200);
  
  let products = allProducts;
  const PASSTHROUGH_HANDLES = ["all", "home-hero", "trending-perfumes", "new-launches", "best-sellers"];
  
  if (!PASSTHROUGH_HANDLES.includes(handle)) {
    const term = handle.toLowerCase();
    
    products = allProducts.filter(p => {
      // 1. Gender field matching (for /men, /women, /unisex, /perfumes-for-men, /perfumes-for-women)
      const gender = p.metafields?.find((m: any) => m.key === 'gender')?.value?.toLowerCase() || '';
      if (term === 'men' || term === 'perfumes-for-men') {
        return gender === 'men' || gender === 'male' || 
          (gender.includes('men') && !gender.includes('women'));
      }
      if (term === 'women' || term === 'perfumes-for-women') {
        return gender === 'women' || gender === 'female' || gender.includes('women');
      }
      if (term === 'unisex' || term === 'unisex-perfumes') {
        return gender === 'unisex' || gender.includes('unisex');
      }
      
      // 2. Match by productType field (e.g., /perfume, /attar, /eau-de-parfum)
      if (p.productType?.toLowerCase() === term || 
          p.productType?.toLowerCase().replace(/\s+/g, '-') === term) {
        return true;
      }
      
      // 3. Match by vendor/brand field (for /brands/[slug])
      if (p.vendor?.toLowerCase().replace(/\s+/g, '-') === term ||
          p.vendor?.toLowerCase() === term.replace(/-/g, ' ')) {
        return true;
      }
      
      // 4. Match by category (e.g., /woody, /floral, /oriental)
      const category = p.metafields?.find((m: any) => m.key === 'category')?.value || p.productType || '';
      if (category.toLowerCase() === term || 
          category.toLowerCase().replace(/\s+/g, '-') === term) {
        return true;
      }
      
      // 5. Fallback: match against tags
      if (p.tags?.some((t: string) => t.toLowerCase() === term)) {
        return true;
      }
      
      return false;
    });
  }

  return {
    id: handle,
    handle: handle,
    title: handle.replace(/-/g, ' ').toUpperCase(),
    description: `Luxury collection of ${handle.replace(/-/g, ' ')}`,
    products: {
      edges: products.slice(0, first).map(p => ({ node: p })),
      pageInfo: {
        hasNextPage: products.length > first,
        endCursor: null
      }
    }
  };
}

export async function getCollectionId(handle: string): Promise<string | null> {
  return handle;
}

export async function getCollectionProducts(
  handle: string,
  first: number = 24,
  after?: string | null,
  filterOptions?: any[],
  sortKey?: string,
  reverse?: boolean
): Promise<CollectionProductsResult | null> {
  const collection = await getCollection(handle, 200);
  if (!collection) return null;

  let products = collection.products.edges.map(e => e.node);

  if (filterOptions && filterOptions.length > 0) {
    filterOptions.forEach(filter => {
      if (filter.tag) {
        const tagTerm = filter.tag.toLowerCase();
        products = products.filter(p => p.tags?.some((t: string) => t.toLowerCase() === tagTerm));
      }
      if (filter.price) {
        const { min, max } = filter.price;
        products = products.filter(p => {
          const amt = parseFloat(p.priceRange.minVariantPrice.amount);
          return (!min || amt >= min) && (!max || amt <= max);
        });
      }
      if (filter.available !== undefined) {
        products = products.filter(p => p.availableForSale === filter.available);
      }
      // Brand/vendor filter
      if (filter.productVendor) {
        const vendorTerm = filter.productVendor.toLowerCase();
        products = products.filter(p => p.vendor?.toLowerCase() === vendorTerm);
      }
      // Product type filter  
      if (filter.productType) {
        const typeTerm = filter.productType.toLowerCase();
        products = products.filter(p => p.productType?.toLowerCase() === typeTerm);
      }
    });
  }

  if (sortKey === "PRICE") {
    products.sort((a, b) => parseFloat(a.priceRange.minVariantPrice.amount) - parseFloat(b.priceRange.minVariantPrice.amount));
  } else if (sortKey === "TITLE") {
    products.sort((a, b) => a.title.localeCompare(b.title));
  }
  
  if (reverse) {
    products.reverse();
  }

  // Build real filter facets from the facets API
  const facets = await getFacets();
  const filters: any[] = [];
  
  if (facets) {
    // Gender filter
    if (facets.genders.length > 0) {
      filters.push({
        id: 'filter.v.gender',
        label: 'Gender',
        type: 'LIST',
        values: facets.genders.map(g => ({
          id: g.value,
          label: g.value,
          count: g.count,
          input: JSON.stringify({ tag: g.value })
        }))
      });
    }
    
    // Brand filter
    if (facets.brands.length > 0) {
      filters.push({
        id: 'filter.p.vendor',
        label: 'Brand',
        type: 'LIST',
        values: facets.brands.map(b => ({
          id: b.value,
          label: b.value,
          count: b.count,
          input: JSON.stringify({ productVendor: b.value })
        }))
      });
    }
    
    // Product Type filter
    if (facets.productTypes.length > 0) {
      filters.push({
        id: 'filter.p.product_type',
        label: 'Product Type',
        type: 'LIST',
        values: facets.productTypes.map(t => ({
          id: t.value,
          label: t.value,
          count: t.count,
          input: JSON.stringify({ productType: t.value })
        }))
      });
    }
    
    // Category filter
    if (facets.categories.length > 0) {
      filters.push({
        id: 'filter.v.category',
        label: 'Category',
        type: 'LIST',
        values: facets.categories.map(c => ({
          id: c.value,
          label: c.value,
          count: c.count,
          input: JSON.stringify({ tag: c.value.toLowerCase() })
        }))
      });
    }
    
    // Occasion filter
    if (facets.occasions.length > 0) {
      filters.push({
        id: 'filter.v.occasion',
        label: 'Occasion',
        type: 'LIST',
        values: facets.occasions.map(o => ({
          id: o.value,
          label: o.value,
          count: o.count,
          input: JSON.stringify({ tag: o.value.toLowerCase() })
        }))
      });
    }
    
    // Season filter
    if (facets.seasons.length > 0) {
      filters.push({
        id: 'filter.v.season',
        label: 'Season',
        type: 'LIST',
        values: facets.seasons.map(s => ({
          id: s.value,
          label: s.value,
          count: s.count,
          input: JSON.stringify({ tag: s.value.toLowerCase() })
        }))
      });
    }
  }

  return {
    title: collection.title,
    description: collection.description,
    bannerImage: (collection as any).image?.url || null,
    products: products.slice(0, first),
    totalCount: products.length,
    pageInfo: {
      hasNextPage: products.length > first,
      endCursor: null
    },
    filters
  };
}

export async function getBanner(slug: string): Promise<any | null> {
  const isServer = typeof window === 'undefined';
  const isDocker = process.env.WATCHPACK_POLLING === "true";
  const API_URL = isServer ? (isDocker ? 'http://django:8000' : 'http://localhost:8000') : 'http://localhost:8000';
  
  console.log(`[getBanner] Fetching banner for slug: ${slug}`);

  try {
    const res = await fetch(`${API_URL}/api/shop/banners/${slug}/`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      // Use absolute URLs for Next.js Image component optimization
      if (data.images && isServer) {
        data.images = data.images.map((img: any) => ({
          ...img,
          image_url: cleanImageUrl(img.image_url) || null,
          mobile_image_url: cleanImageUrl(img.mobile_image_url) || null,
        }));
      }
      return data;
    }
  } catch (err) {
    console.error(`Error fetching banner for slug ${slug}:`, err);
  }
  return null;
}
