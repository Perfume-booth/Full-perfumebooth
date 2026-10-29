import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: [
    '192.168.31.168',
    '192.168.31.168:3001',
    'localhost',
    'localhost:3001'
  ],
  images: {
    remotePatterns: [
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
        hostname: 'images.unsplash.com',
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
    ],
  },
  async rewrites() {
    const backend = (process.env.DJANGO_API_ORIGIN ||
      (process.env.WATCHPACK_POLLING === 'true' ? 'http://django:8000' : 'http://127.0.0.1:8000')).replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*/`
      },
      {
        source: '/media/:path*',
        destination: `${backend}/media/:path*`
      }
    ];
  }
};

export default nextConfig;
