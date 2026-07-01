import { MetadataRoute } from 'next';
import { shopifyFetch } from '@/lib/shopify/fetcher';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.perfumebooth.com';

/**
 * Dynamic Sitemap Generator for Next.js 14+
 * Safely fetches active products/collections from Shopify Storefront API
 * and falls back gracefully to a rich list of static, category, brand, and policy routes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  // 1. Define all static, brand, category, gender, scent profile, and policy pages
  const staticRoutes: MetadataRoute.Sitemap = [
    // Core routes
    { url: baseUrl, lastModified, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/all`, lastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/new`, lastModified, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/brands`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/scent-shot`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/wishlist`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/help`, lastModified, changeFrequency: 'monthly', priority: 0.5 },

    // Gender pages
    { url: `${baseUrl}/men`, lastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/women`, lastModified, changeFrequency: 'daily', priority: 0.9 },

    // Brand pages
    { url: `${baseUrl}/al-haramain`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/arabiyat-prestige`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/lomani`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/louis-cardin`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/mpf`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/new-nb`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/otoori`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/swiss-arabian`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/lattafa`, lastModified, changeFrequency: 'weekly', priority: 0.8 },

    // Category pages
    { url: `${baseUrl}/perfumes`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/attars`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/deodorants`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/gift-sets`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/mist`, lastModified, changeFrequency: 'weekly', priority: 0.8 },

    // Scent profile pages
    { url: `${baseUrl}/citrus`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/woody`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/fresh`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/aquatic`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/spicy`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/oriental`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/floral`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/oud`, lastModified, changeFrequency: 'weekly', priority: 0.8 },

    // Info & Policies pages
    { url: `${baseUrl}/info/about-us`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/info/contact-us`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/info/disclaimers`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/info/faq`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/info/policies/privacy`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/info/policies/refund`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/info/policies/shipping`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/info/policies/terms`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
  ];

  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    // 2. Safely fetch dynamic products and collections if Shopify credentials exist
    const domain = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
    const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    if (domain && storefrontAccessToken) {
      const response = await shopifyFetch<any>({
        query: `
          {
            products(first: 250) {
              edges {
                node {
                  handle
                  updatedAt
                }
              }
            }
            collections(first: 250) {
              edges {
                node {
                  handle
                  updatedAt
                }
              }
            }
          }
        `,
        next: { revalidate: 3600 }
      });

      if (response?.body?.data) {
        const products = response.body.data.products?.edges.map((e: any) => ({
          url: `${baseUrl}/products/${e.node.handle}`,
          lastModified: new Date(e.node.updatedAt),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        })) || [];

        const collections = response.body.data.collections?.edges.map((e: any) => ({
          url: `${baseUrl}/${e.node.handle}`,
          lastModified: new Date(e.node.updatedAt),
          changeFrequency: 'daily' as const,
          priority: 0.9,
        })) || [];

        dynamicRoutes = [...collections, ...products];
      }
    }
  } catch (error) {
    console.error('Failed to fetch dynamic Shopify routes for sitemap:', error);
  }

  // Combine static fallback routes with dynamic ones (if successfully retrieved)
  return [...staticRoutes, ...dynamicRoutes];
}

