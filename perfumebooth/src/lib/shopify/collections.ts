import {
  getCollectionQuery,
  getSearchProductsQuery,
  getCollectionsQuery,
  getCollectionMetaQuery,
  getProductsQuery
} from '../queries';
import { shopifyFetch, mapNodes } from './fetcher';
import { ShopifyCollection, Edge, ShopifyProduct } from './types';
import { getBrands, getProductTypes } from './products';

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

export async function getAllCollections(first: number = 250): Promise<ShopifyCollection[]> {
  const { body } = await shopifyFetch<{
    data: { collections: { edges: { node: ShopifyCollection }[] } }
  }>({
    query: getCollectionsQuery,
    variables: { first },
  });

  return mapNodes(body?.data?.collections?.edges || []);
}

export async function getCollection(
  handle: string,
  first: number = 30,
  after?: string
): Promise<ShopifyCollection | null> {
  if (!handle) return null;

  const { body } = await shopifyFetch<{
    data: { collection: ShopifyCollection }
  }>({
    query: getCollectionQuery,
    variables: { handle, first, after },
  });

  return body?.data?.collection || null;
}

export async function getCollectionId(handle: string): Promise<string | null> {
  if (!handle) return null;
  const { body } = await shopifyFetch<{
    data: { collection: { id: string } }
  }>({
    query: getCollectionMetaQuery,
    variables: { handle }
  });
  return body?.data?.collection?.id || null;
}

export async function getCollectionProducts(
  handle: string,
  first: number = 24,
  after?: string | null,
  filterOptions?: any[],
  sortKey?: string,
  reverse?: boolean
): Promise<CollectionProductsResult | null> {
  if (!filterOptions) filterOptions = [];

  const handleMap: Record<string, string> = {
    'mist': 'body-mist',
    'body-mists': 'body-mist'
  };
  const mappedHandle = handleMap[handle] || handle;

  // Only force availability filter for 'all' products, other collections use their own logic
  if (mappedHandle === "all") {
    const hasAvailabilityFilter = filterOptions.some((f: any) => f.available !== undefined);
    if (!hasAvailabilityFilter) {
      filterOptions.push({ available: true });
    }
  }

  // Identify scent profile handles to force dynamic tag search (avoids misconfigured Shopify collection pages)
  const SCENT_HANDLES = ["citrus", "woody", "fresh", "aquatic", "spicy", "oriental", "floral", "oud"];
  const GENDER_HANDLES = ["men", "women", "unisex", "perfumes-for-men", "perfumes-for-women", "unisex-perfumes"];
  const BRANDS_HANDLES = ["al-haramain", "arabiyat-prestige", "lomani", "louis-cardin", "mpf", "new-nb", "otoori", "lattafa", "swiss-arabian"];
  
  const isScentProfile = SCENT_HANDLES.includes(mappedHandle.toLowerCase());
  const isGenderProfile = GENDER_HANDLES.includes(mappedHandle.toLowerCase());
  const isBrandProfile = BRANDS_HANDLES.includes(mappedHandle.toLowerCase());

  // For this store, we use handleAllProducts for most filtered queries because 
  // the Search API handles tag/brand matching across fields much more reliably.
  // We also use it if a search keyword 'q' is present in filterOptions (passed as a special filter)
  const searchKeyword = (filterOptions as any)?.find?.((f: any) => f.q)?.q || "";
  const actualFilters = filterOptions?.filter?.((f: any) => !f.q) || [];

  if (mappedHandle === 'all' || isScentProfile || isGenderProfile || isBrandProfile || actualFilters.length > 0 || searchKeyword) {
    return await handleAllProducts(first, after, actualFilters, sortKey, reverse, mappedHandle, searchKeyword);
  }

  // Standard case: Fetch specific collection
  const { body } = await shopifyFetch<any>({
    query: getCollectionQuery,
    variables: {
      handle: mappedHandle,
      first,
      after: after || null,
      sortKey,
      reverse: reverse ?? false,
      filters: filterOptions.length > 0 ? filterOptions : null
    }
  });

  const collection = body?.data?.collection;
  if (!collection) {
    // Fallback: If the specific collection handle isn't found, 
    // try the search API which can resolve brand names and tags more flexibly.
    if (mappedHandle !== "all") {
      return await handleAllProducts(first, after, filterOptions, sortKey, reverse, mappedHandle, searchKeyword);
    }
    return null;
  }

  const products = mapNodes(collection.products.edges);

  return {
    title: collection.title,
    description: collection.description,
    bannerImage: collection.image?.url || null,
    products,
    totalCount: collection.products.totalCount || products.length,
    pageInfo: collection.products.pageInfo,
    filters: collection.products.filters
  };
}

/** 
 * PRIVATE HELPERS 
 */

async function handleAllProducts(
  first: number,
  after: any,
  filterOptions: any[],
  sortKey: any,
  reverse: any,
  collectionHandle: string = "all",
  searchKeyword: string = ""
): Promise<CollectionProductsResult> {
  // Map handles to searchable terms if they are specific collections or scent profiles
  const handleMap: Record<string, string> = {
    'perfumes-for-men': 'Perfume for Men',
    'perfumes-for-women': 'Perfume for Women',
    'unisex-perfumes': 'Unisex',
    'deodorants': 'Deodorant',
    'attars': 'Attar',
    'gift-sets': 'Gift Set',
    'scent-shot': 'Scent Shot',
    'mist': 'Mist',
    'body-mist': 'Body Mist',
    'body-mists': 'Body Mist',
    'perfumes': 'Perfume',
    'citrus': 'Citrus',
    'woody': 'Woody',
    'fresh': 'Fresh',
    'aquatic': 'Aquatic',
    'spicy': 'Spicy',
    'oriental': 'Oriental',
    'floral': 'Floral',
    'oud': 'Oud'
  };

  // Group filters by type for logical joining (OR within groups, AND between groups)
  // A brand filter is a filter with productVendor, or a tag filter whose value corresponds to a known brand name
  // This prevents category tags (like "Perfume for Men") from being misclassified as brand filters.
  const isBrandFilter = (f: any) => {
    if (f.productVendor) return true;
    if (f.tag) {
      const lowerTag = f.tag.toLowerCase();
      // Import/access TOP_BRANDS to verify if the tag refers to a brand
      const brandsList = ["al haramain", "arabiyat prestige", "lomani", "louis cardin", "mpf", "new nb", "otoori", "lattafa", "swiss arabian"];
      return brandsList.some(b => lowerTag.includes(b) || b.includes(lowerTag));
    }
    return false;
  };

  const isGenderFilter = (f: any) => {
    if (f.tag) {
      const lowerTag = f.tag.toLowerCase();
      return lowerTag === "perfume for men" || lowerTag === "perfume for women" || lowerTag === "unisex perfume" || lowerTag === "men" || lowerTag === "women" || lowerTag === "unisex";
    }
    return false;
  };

  const brands = filterOptions.filter(isBrandFilter).map(f => f.productVendor || f.tag);
  const genders = filterOptions.filter(isGenderFilter).map(f => f.tag);

  // Inject gender from collection handle if applicable
  const lowerHandle = collectionHandle.toLowerCase();
  if (lowerHandle === "men" || lowerHandle === "perfumes-for-men") {
    if (!genders.includes("Men")) genders.push("Men");
  } else if (lowerHandle === "women" || lowerHandle === "perfumes-for-women") {
    if (!genders.includes("Women")) genders.push("Women");
  } else if (lowerHandle === "unisex" || lowerHandle === "unisex-perfumes") {
    if (!genders.includes("Unisex")) genders.push("Unisex");
  }

  // nativeFilters should contain everything except brands and genders (which we fuzzy match via query)
  const nativeFilters = filterOptions.filter(f => !isBrandFilter(f) && !isGenderFilter(f));

  // Add collection constraint
  let collectionTagConstraint: string | null = null;
  if (collectionHandle !== "all" && !["men", "women", "unisex", "perfumes-for-men", "perfumes-for-women", "unisex-perfumes"].includes(lowerHandle)) {
    const scentHandles = ["citrus", "woody", "fresh", "aquatic", "spicy", "oriental", "floral", "oud"];
    const isScent = scentHandles.includes(lowerHandle);

    if (isScent) {
      // Scent profiles are added as high-performance keyword queries (bypassing strict filter facet constraints)
      // This is handled in queryParts later to prevent empty results.
    } else if (handleMap[collectionHandle]) {
      // Category collection (e.g. Deodorants, Attars)
      collectionTagConstraint = handleMap[collectionHandle];
    } else {
      // Brand collection (e.g. Lattafa, Al Haramain)
      // Add to brands list so it uses the flexible (tag OR keyword) search
      const brandName = collectionHandle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!brands.includes(brandName)) {
        brands.push(brandName);
      }
    }
  }

  // We universally use getProductsQuery because it fully supports complex OR/AND query string compilation
  // (e.g., `(product_type:"Mist" OR product_type:"Attar") AND (tag:"Men")`)
  // The Storefront Search API strictly rejects this syntax and lacks native OR support for facet filters.
  const isSearchQuery = false;
  const queryToUse = getProductsQuery;

  // Map sortKey appropriately for ProductSortKeys
  let apiSortKey = "RELEVANCE";
  if (sortKey === "CREATED") {
    apiSortKey = "CREATED_AT";
  } else if (sortKey === "BEST_SELLING") {
    apiSortKey = "BEST_SELLING";
  } else if (sortKey === "PRICE" || sortKey === "price-asc" || sortKey === "price-desc") {
    apiSortKey = "PRICE";
  }

  const queryParts = [];

  // 1. Keyword search
  if (searchKeyword) {
    queryParts.push(`("${searchKeyword}")`);
  }

  // 2. Brands (OR logic: show products from ANY selected brand)
  if (brands.length > 0) {
    // We search across multiple fields for brands as this store's data is fragmented
    const brandQuery = brands.map(b => `(tag:"${b}" OR "${b}")`).join(" OR ");
    queryParts.push(`(${brandQuery})`);
  }

  // 3. Scent profile or Collection constraint
  const scentHandles = ["citrus", "woody", "fresh", "aquatic", "spicy", "oriental", "floral", "oud"];
  if (scentHandles.includes(lowerHandle)) {
    const scentTerm = handleMap[collectionHandle] || collectionHandle;
    queryParts.push(`(tag:"${scentTerm}" OR "${scentTerm}")`);
  } else if (collectionTagConstraint) {
    queryParts.push(`(tag:"${collectionTagConstraint}" OR "${collectionTagConstraint}")`);
  }

  // 4. Genders (OR logic within genders)
  if (genders.length > 0) {
    const genderQuery = genders.map(g => {
      const lower = g.toLowerCase();
      if (lower.includes("women") || lower.includes("female")) {
        return `(tag:"Perfume for Women" OR tag:"Women" OR "Women" OR "Female" OR "For Her" OR tag:"Unisex Perfume" OR tag:"Unisex" OR "Unisex")`;
      } else if (lower.includes("men") || lower.includes("male")) {
        // Exclude 'women' from men search using Shopify's NOT operator (-) to avoid pulling in women's products
        // We also explicitly INCLUDE Unisex items because many products (like Attars) are gender-neutral.
        return `(tag:"Perfume for Men" OR tag:"Men" OR ("Men" -"Women") OR "Male" OR "For Him" OR tag:"Unisex Perfume" OR tag:"Unisex" OR "Unisex")`;
      } else if (lower.includes("unisex")) {
        return `(tag:"Unisex Perfume" OR tag:"Unisex" OR "Unisex")`;
      }
      return `(tag:"${g}" OR "${g}")`;
    }).join(" OR ");
    queryParts.push(`(${genderQuery})`);
  }

  // 5. Native Filters: Compile ALL filters directly into the query string to support OR grouping
  // which prevents Shopify from strictly ANDing multiple tags or product types from the same category.
  if (nativeFilters.length > 0) {
    const types: string[] = [];
    const tags: string[] = [];
    const availability: string[] = [];
    const prices: string[] = [];

    nativeFilters.forEach(f => {
      // Use fuzzy keyword fallback for types and tags to support fragmented backend data
      if (f.productType) types.push(`(product_type:"${f.productType}" OR "${f.productType}")`);
      if (f.tag) tags.push(`(tag:"${f.tag}" OR "${f.tag}")`);
      if (f.available !== undefined) availability.push(`available_for_sale:${f.available}`);
      if (f.price) prices.push(`variants.price:>=${f.price.min} AND variants.price:<=${f.price.max}`);
    });

    if (types.length > 0) queryParts.push(`(${types.join(" OR ")})`);
    if (tags.length > 0) queryParts.push(`(${tags.join(" OR ")})`);
    if (availability.length > 0) queryParts.push(`(${availability.join(" OR ")})`); // though usually only one
    if (prices.length > 0) queryParts.push(`(${prices.join(" OR ")})`); // though usually only one
  }

  const searchQ = queryParts.length > 0 ? queryParts.join(" AND ") : "*";

  const { body, error } = await shopifyFetch<any>({
    query: queryToUse,
    variables: {
      first,
      after: after || null,
      query: searchQ === "*" ? (isSearchQuery ? "*" : null) : searchQ, // search connection requires non-null String, root products connection prefers null
      sortKey: apiSortKey,
      reverse: reverse ?? false,
      // Since we compiled all nativeFilters into the search query string with correct OR grouping,
      // we bypass the 'filters' argument to avoid strict ANDing array conflicts.
      ...(isSearchQuery ? { filters: null } : {})
    },
    next: { revalidate: 0 }
  });

  if (error) {
    console.error(`[Shopify Fetch Error during handleAllProducts]:`, error);
  }

  const searchData = isSearchQuery ? body?.data?.search : body?.data?.products;
  const products = mapNodes(searchData?.edges || []);

  // Since Search API connection doesn't return facets (filters) in this version,
  // we generate them from standard product lists as a fallback
  const [vendors, types] = await Promise.all([getBrands(), getProductTypes()]);
  const finalFilters = generateDefaultFilters(vendors, types);

  const mappedTitle = handleMap[collectionHandle] || collectionHandle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  let bannerImage = null;
  let finalTitle = collectionHandle === "all" ? "All Products" : mappedTitle;
  let finalDescription = collectionHandle === "all" ? "Explore our entire premium collection." : `Explore our premium ${mappedTitle} collection.`;

  if (collectionHandle !== "all" && !isSearchQuery) {
    // Fetch native collection metadata for banner images and descriptions
    const { body: metaBody } = await shopifyFetch<any>({
      query: getCollectionMetaQuery,
      variables: { handle: collectionHandle }
    });
    if (metaBody?.data?.collection) {
      if (metaBody.data.collection.image?.url) {
        bannerImage = metaBody.data.collection.image.url;
      }
      if (metaBody.data.collection.title) {
        finalTitle = metaBody.data.collection.title;
      }
      if (metaBody.data.collection.description) {
        finalDescription = metaBody.data.collection.description;
      }
    }
  }

  return {
    title: finalTitle,
    description: finalDescription,
    bannerImage: bannerImage,
    products: products,
    totalCount: searchData?.totalCount || searchData?.edges?.length || products.length,
    pageInfo: searchData?.pageInfo || { hasNextPage: false, endCursor: null },
    filters: finalFilters
  };
}

function generateDefaultFilters(vendors: string[], types: string[]) {
  return [
    {
      id: "filter.p.vendor",
      label: "Brand",
      type: "LIST",
      values: vendors.map(v => ({ id: v, label: v, count: 0, input: JSON.stringify({ productVendor: v }) }))
    },
    {
      id: "filter.p.product_type",
      label: "Product Type",
      type: "LIST",
      values: types.map(t => ({ id: t, label: t, count: 0, input: JSON.stringify({ productType: t }) }))
    }
  ];
}



