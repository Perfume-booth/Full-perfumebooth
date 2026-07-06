import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.perfumebooth.com';

/**
 * Dynamic Sitemap Generator
 * Safely fetches active products from Django REST API
 * and falls back gracefully to static category, brand, and policy routes.
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
    const res = await fetch('http://localhost:8000/api/shop/products/');
    if (res.ok) {
      const products = await res.json();
      const productRoutes = products.map((p: any) => ({
        url: `${baseUrl}/products/${p.slug}`,
        lastModified: new Date(p.updated_at || lastModified),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

      dynamicRoutes = [...productRoutes];
    }
  } catch (error) {
    console.error('Failed to fetch dynamic Django routes for sitemap:', error);
  }

  return [...staticRoutes, ...dynamicRoutes];
}


