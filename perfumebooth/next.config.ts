import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    '192.168.31.168',
    '192.168.31.168:3000',
    'localhost',
    'localhost:3000'
  ],
  skipTrailingSlashRedirect: true,
  experimental: {
    optimizePackageImports: ["@/components/ui/icons"],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/s/files/1/0718/5786/4996/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-940ccf6255b54fa799a9b01050e6c227.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-3f642c2b9ee242a79d619d782e435c8d.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'judgeme.imgix.net',
      },
      {
        protocol: 'https',
        hostname: 'cdn.judge.me',
      },
      {
        protocol: 'https',
        hostname: 'cdn1.judge.me',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
      },
      {
        protocol: 'http',
        hostname: 'django',
        port: '8000',
      },
    ],
    qualities: [75, 85],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  async rewrites() {
    const isDocker = process.env.WATCHPACK_POLLING === "true";
    const API_URL = isDocker ? 'http://django:8000' : 'http://localhost:8000';
    return {
      beforeFiles: [
        {
          source: '/media/:path*',
          destination: `${API_URL}/media/:path*`
        },
        {
          source: '/api/shop/:path*',
          destination: `${API_URL}/api/shop/:path*`
        }
      ],
      afterFiles: [],
      fallback: []
    };
  },
  async redirects() {
    return [
      {
        source: '/collections/:collection/products/:product',
        destination: '/products/:product',
        permanent: true,
      },
      {
        source: '/collections/all',
        destination: '/all',
        permanent: true,
      },
      {
        source: '/collections/brands/:brand',
        destination: '/:brand',
        permanent: true,
      },
      {
        source: '/brands/:brand',
        destination: '/:brand',
        permanent: true,
      },
      {
        source: '/collections/:handle',
        destination: '/:handle',
        permanent: true,
      },
      {
        source: '/product/:slug',
        destination: '/products/:slug',
        permanent: true,
      },
      {
        source: '/products/mpf-lamour-edp-perfume-for-unisex-long-lasting-100ml-copy',
        destination: '/products/mpf-cashmeran-edp-100ml-unisex-perfume',
        permanent: true,
      },
      {
        source: '/products/mpf-pura-vida-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-accent-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her',
        permanent: true,
      },
      {
        source: '/products/mpf-stellar-edp-perfume-for-unisex-long-lasting-75ml-copy',
        destination: '/products/mpf-monferrina-edp-75ml-unisex-perfume',
        permanent: true,
      },
      {
        source: '/products/mpf-bergamot-perfume-for-unisex-edp-long-lasting-75ml-copy',
        destination: '/products/mpf-terrano-edp-75ml-unisex-perfume',
        permanent: true,
      },
      {
        source: '/products/mpf-murano-crystal-edp-for-women-100-ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-bergamot-edp-75ml-unisex-perfume',
        permanent: true,
      },
      {
        source: '/products/the-eternal-club-by-mpf-eau-de-parfum-200ml-strong-long-lasting-fragrance-gift-for-him-copy',
        destination: '/products/sensitive-edp-100ml-perfume-for-women',
        permanent: true,
      },
      {
        source: '/products/mpf-leather-for-men-perfume-for-men-100ml-strong-long-lasting-fragrance-gift-for-him-copy',
        destination: '/products/mpf-fabulicious-100ml-perfume-for-men',
        permanent: true,
      },
      {
        source: '/products/mpf-leather-for-men-perfume-for-men-100ml-strong-long-lasting-fragrance-gift-for-him',
        destination: '/products/mpf-leather-perfume-for-men-100ml-long-lasting-scent',
        permanent: true,
      },
      {
        source: '/products/mpf-timeline-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-dark-saffron-perfumed-mist-250ml-unisex-fragrance-spray',
        permanent: true,
      },
      {
        source: '/products/mpf-love-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-timeline-perfumed-mist-250ml-for-women-fragrance-spray',
        permanent: true,
      },
      {
        source: '/products/mpf-amber-leather-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-love-perfumed-mist-250ml-for-women-fragrance-spray-india',
        permanent: true,
      },
      {
        source: '/products/mpf-cheery-on-the-top-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-amber-leather-perfumed-mist-250ml-women-body-spray',
        permanent: true,
      },
      {
        source: '/products/mpf-majestic-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her-copy-1',
        destination: '/products/mpf-cheery-on-the-top-perfumed-mist-250ml-women-spray',
        permanent: true,
      },
      {
        source: '/products/mpf-accent-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-accent-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her',
        permanent: true,
      },
      {
        source: '/products/mpf-aqua-blue-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-accent-perfumed-mist-250ml-women-fragrance-spray',
        permanent: true,
      },
      {
        source: '/products/mpf-ideal-perfumed-mist-for-women-or-unisex-250ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-ideal-perfumed-mist-250ml-women-body-fragrance-spray',
        permanent: true,
      },
      {
        source: '/products/mpf-deep-desire-perfumed-mist-for-women-250ml-strong-long-lasting-fragrance-gift-for-her-copy',
        destination: '/products/mpf-freedom-perfumed-mist-250ml-women-body-fragrance-spray',
        permanent: true,
      },
      {
        source: '/products/lomani-elixir-perfume-for-women-100ml-long-lasting',
        destination: '/products/lomani-elixir-100ml-perfume-for-women',
        permanent: true,
      },
      {
        source: '/products/lomani-elixir-perfume-for-women-100ml-long-lasting-copy',
        destination: '/products/lomani-my-baby-doll-100ml-perfume-for-women',
        permanent: true,
      },
      {
        source: '/products/otoori-hala-attar-concentrated-oil-15ml-copy',
        destination: '/products/otoori-hala-attar-15ml-concentrated-perfume-oil',
        permanent: true,
      },
      {
        source: '/products/otoori-amber-natural-attar-concentrated-oil-15ml-copy',
        destination: '/products/otoori-walhan-attar-15ml-concentrated-perfume-oil',
        permanent: true,
      },
      {
        source: '/products/otoori-ahsees-attar-concentrated-oil-15ml-copy',
        destination: '/products/otoori-oud-al-layl-attar-15ml-concentrated-perfume-oil',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob: wss:;",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
