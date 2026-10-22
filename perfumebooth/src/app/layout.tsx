import type { Metadata } from "next";
export const dynamic = 'force-dynamic';
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
// TypeScript may complain about side-effect CSS imports when no declarations exist.
// @ts-ignore
import "./globals.css";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ScrollToTop from "@/components/layout/ScrollToTop";
import MaterialSymbolsInjector from "@/components/layout/MaterialSymbolsInjector";
import AnalyticsConsent from '@/components/layout/AnalyticsConsent';
import ClientSideHydrators from "@/components/layout/ClientSideHydrators";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});






export const metadata: Metadata = {
  title: {
    default: "Perfume Booth",
    template: "%s | Perfume Booth",
  },
  description:
    "Shop Exclusive fragrances, attars, deodorants, and body mists from top brands like Lattafa, Swiss Arabian, Louis Cardin & more.",
  keywords: ["perfume", "fragrance", "attar", "oud", "deodorant", "Swiss Arabian", "Lattafa"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.perfumebooth.com"),
  openGraph: {
    type: "website",
    siteName: "Perfume Booth",
    locale: "en_IN",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Perfume Booth",
  },
  verification: {
    google: "zw1tdqkf1VyyhppIFmQG6lHry5XTWj3Qmgc6AJyzbXA",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#1a1410",
  width: "device-width",
  initialScale: 1,
};

import { getBrands } from "@/lib/catalog";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brands = await getBrands();

  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Perfume Booth",
              url: "https://www.perfumebooth.com",
              logo: "/favicon.ico"
            })
          }}
        />
      </head>
      <body className="antialiased font-sans bg-[var(--color-bg)] text-[var(--color-text-primary)]" suppressHydrationWarning>
        <ScrollToTop />
        <Toaster position="bottom-right" />
        {/* Progress bar placeholder (mounted on client) */}
        <Navbar initialBrands={brands} />
        <main>
          {children}
        </main>
        <Footer />
        {/* Global overlays & Client Hydrators */}
        <MaterialSymbolsInjector />
        <ClientSideHydrators />
        <AnalyticsConsent />
      </body>
    </html>
  );
}
