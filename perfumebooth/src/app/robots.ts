import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.perfumebooth.com';

/**
 * Standard robots.txt generator for Next.js App Router.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',      // Internal APIs
        '/account/',  // User account pages 
        '/checkout/', // Checkout pages
        '/admin/',    // Admin area
        '/*?*',       // Prevent indexing of URLs with query parameters (to avoid duplicate content)
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
