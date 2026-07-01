import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
// TypeScript may complain about side-effect CSS imports when no declarations exist.
// @ts-ignore
import "./globals.css";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ScrollToTop from "@/components/layout/ScrollToTop";
import MaterialSymbolsInjector from "@/components/layout/MaterialSymbolsInjector";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <GoogleTagManager gtmId="GTM-PLC7P2NZ" />
      <head>
        <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Perfume Booth",
              url: "https://www.perfumebooth.com",
              logo: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/android-chrome-512x512.png"
            })
          }}
        />
      </head>
      <body className="antialiased font-sans bg-[var(--color-bg)] text-[var(--color-text-primary)]" suppressHydrationWarning>
        <ScrollToTop />
        <Toaster position="bottom-right" />
        {/* Progress bar placeholder (mounted on client) */}
        <Navbar />
        <main>
          {children}
        </main>
        <Footer />
        {/* Global overlays & Client Hydrators */}
        <MaterialSymbolsInjector />
        <ClientSideHydrators />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
