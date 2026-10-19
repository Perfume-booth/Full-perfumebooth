import { getRefundPolicy } from "@/lib/catalog";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import InfoHero from "@/components/layout/InfoHero";

export const metadata: Metadata = {
  title: "Refund Policy | PerfumeBooth",
  description:
    "Learn about PerfumeBooth's return, exchange, and refund policies for authentic perfumes and fragrances.",
};

export default async function RefundPolicyPage() {
  const policy = await getRefundPolicy();

  if (!policy) {
    notFound();
  }

  return (
    <main className="bg-[var(--color-bg)] min-h-screen">

      <InfoHero 
        title={policy.title} 
        desktopSrc={policy.hero?.desktopSrc || "/images/fallback-luxury.svg"}
        mobileSrc={policy.hero?.mobileSrc || policy.hero?.desktopSrc || "/images/fallback-luxury.svg"}
        pillText="PerfumeBooth Official Policy" 
        effectiveDate="09.08.2024" 
      />

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-6 py-10">
       
        {/* Policy Body */}
        <div
          className="rich-text"
          dangerouslySetInnerHTML={{ __html: policy.body }}
        />

        {/* Footer Bar */}
        <div className="mt-16 pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
          <span>
            © {new Date().getFullYear()} PerfumeBooth Pvt. Ltd. All rights
            reserved.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-gold)] inline-block" />
            Protected by industry-standard encryption
          </span>
        </div>
      </div>
    </main>
  );
}
