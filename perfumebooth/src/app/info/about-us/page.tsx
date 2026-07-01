import { getAboutUs } from "@/lib/shopify";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import InfoHero from "@/components/layout/InfoHero";

export const metadata: Metadata = {
  title: "About Us | PerfumeBooth",
  description:
    "Learn more about PerfumeBooth, our story, our mission, and our commitment to bringing Exclusive fragrances to everyone.",
};

export default async function AboutUsPage() {
  const policy = await getAboutUs();

  if (!policy) {
    notFound();
  }

  return (
    <main className="bg-[var(--color-bg)] min-h-screen">

      <InfoHero 
        title={policy.title} 
        desktopSrc="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/about_782d7c52-96ce-47ad-b030-d50b3961e3a4.jpg?v=1778134332" 
        mobileSrc="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/about.jpg?v=1778130177" 
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