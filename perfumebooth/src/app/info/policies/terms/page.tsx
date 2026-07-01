import { getTermsAndConditions } from "@/lib/shopify";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import InfoHero from "@/components/layout/InfoHero";

export const metadata: Metadata = {
  title: "Privacy Policy | PerfumeBooth",
  description:
    "Read PerfumeBooth's Privacy Policy to understand how we collect, use, and protect your personal information.",
};

export default async function TermsAndConditionsPage() {
  const policy = await getTermsAndConditions();

  if (!policy) {
    notFound();
  }

  return (
    <main className="bg-[var(--color-bg)] min-h-screen">

      <InfoHero 
        title={policy.title} 
        desktopSrc="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/terms.jpg?v=1778133307" 
        mobileSrc="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/TERMS-AND-CONDITIONS-900-600_jpg.jpg?v=1778136087" 
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