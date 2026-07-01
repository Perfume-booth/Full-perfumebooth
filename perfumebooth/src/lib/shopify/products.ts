import { 
  getProductsQuery, 
  getBestSellingProductsQuery, 
  getProductByHandleQuery, 
  getProductRecommendationsQuery,
  getSearchProductsQuery,
  getProductTypesQuery,
  getVendorsQuery
} from '../queries';
import { shopifyFetch, mapNodes } from './fetcher';
import { ShopifyProduct, Edge } from './types';

export async function getProducts(first: number = 30): Promise<ShopifyProduct[]> {
  const { body } = await shopifyFetch<{
    data: { products: { edges: Edge<ShopifyProduct>[] } }
  }>({
    query: getProductsQuery,
    variables: { first, query: "availability:in_stock" },
  });

  return mapNodes(body.data?.products?.edges || []);
}

export async function getProductRecommendations(productId: string): Promise<ShopifyProduct[]> {
  if (!productId) return [];

  const { body } = await shopifyFetch<{
    data: { productRecommendations: ShopifyProduct[] }
  }>({
    query: getProductRecommendationsQuery,
    variables: { productId },
  });

  const products = body?.data?.productRecommendations || [];
  return products.filter((p) => p.availableForSale === true);
}

export async function getBestSellingProducts(first: number = 30): Promise<ShopifyProduct[]> {
  const { body } = await shopifyFetch<{
    data: { products: { edges: Edge<ShopifyProduct>[] } }
  }>({
    query: getBestSellingProductsQuery,
    variables: { first, query: "availability:in_stock" },
  });

  if (!body?.data?.products) return [];
  return mapNodes(body.data.products.edges || []);
}

export async function getProduct(handle: string): Promise<ShopifyProduct | null> {
  if (!handle) return null;

  const { body } = await shopifyFetch<{
    data: { product: ShopifyProduct }
  }>({
    query: getProductByHandleQuery,
    variables: { handle },
  });

  return body?.data?.product || null;
}

export async function getBrands(): Promise<string[]> {
  const { body } = await shopifyFetch<{
    data: { products: { edges: Edge<{ vendor: string }>[] } }
  }>({
    query: getVendorsQuery,
  });

  if (!body?.data?.products?.edges) return [];

  const vendors = mapNodes(body.data.products.edges).map((v) => v.vendor);
  return [...new Set<string>(vendors)];
}

export async function searchProducts(
  query: string,
  first: number = 30,
  sortKey: string = "RELEVANCE",
  reverse: boolean = false
): Promise<{ totalCount: number; products: ShopifyProduct[] }> {
  const { body } = await shopifyFetch<{
    data: { 
      search: { 
        totalCount: number; 
        edges: Edge<ShopifyProduct>[] 
      } 
    }
  }>({
    query: getSearchProductsQuery,
    variables: {
      query: query || "*",
      first,
      sortKey,
      reverse,
      filters: [{ available: true }]
    },
    next: { revalidate: 0 }
  });

  const searchData = body?.data?.search;
  if (!searchData) return { totalCount: 0, products: [] };

  const products = mapNodes(searchData.edges || []);
  return { totalCount: searchData.totalCount || 0, products };
}

export async function getProductTypes(): Promise<string[]> {
  const { body } = await shopifyFetch<{
    data: { productTypes: { edges: Edge<string>[] } }
  }>({
    query: getProductTypesQuery,
  });

  return mapNodes(body?.data?.productTypes?.edges || []).filter(Boolean);
}
