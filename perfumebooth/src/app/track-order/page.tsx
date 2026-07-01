import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import TrackOrderForm from "@/components/orders/TrackOrderForm";

export const metadata: Metadata = {
  title: "Track Order",
  description: "Track the status of your Perfume Booth order in real-time. Enter your order ID number to check fulfillment, shipping, and delivery status.",
  alternates: {
    canonical: "https://www.perfumebooth.com/track-order"
  }
};

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] w-full text-[var(--color-text-primary)] font-sans pt-20 md:pt-36 pb-16 overflow-x-hidden">
      {/* Breadcrumbs */}
      <div className="hidden md:block max-w-7xl mx-auto md:py-4 px-4 md:px-6 mb-8 text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-semibold border-l-[3px] border-[#b8924a] bg-gradient-to-r from-[#b8924a]/5 to-transparent">
        <div className="flex flex-wrap items-center">
          <Link href="/" className="hover:text-[var(--color-text-primary)] transition-colors">Home</Link>
          <span className="mx-2 md:mx-3 opacity-50">/</span>
          <span className="text-[var(--color-text-primary)]">Track Order</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-center min-h-[50vh]">
        <Suspense fallback={
          <div className="w-full max-w-md mx-auto p-8 bg-white border border-[#ede8e0] rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-8 h-8 border-4 border-[#b8924a] border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs text-neutral-500 font-medium">Loading tracker...</span>
          </div>
        }>
          <TrackOrderForm />
        </Suspense>
      </div>
    </div>
  );
}
