import type { Metadata } from "next";
import SupportCategories from "@/components/help/SupportCategories";
import ContactOptions from "@/components/help/ContactOptions";
import { AnimatedChevronRight as ChevronRight } from "@/components/ui/icons/AnimatedChevronRight";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help & Support | PerfumeBooth",
  description: "Get assistance with your PerfumeBooth orders, payments, and account questions.",
};

export default function HelpPage() {
  return (
    <main className="bg-[var(--color-bg)] min-h-screen py-32 ">

      {/* ── Contact Section ── */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <ContactOptions />
      </section>


      {/* ── Support Categories ── */}
      <section className="max-w-7xl mx-auto px-6 mb-24 ">
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Browse by Topic
            </h2>
            <p className="text-[var(--color-text-muted)]">
              Select a category to find specific answers and guides tailored to your needs.
            </p>
          </div>
          <Link
            href="/info/faq"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] border-b border-[var(--color-gold)] pb-1 hover:text-[var(--color-gold-dark)] hover:border-[var(--color-gold-dark)] transition-colors"
          >
            View All FAQs
            <ChevronRight size={14} />
          </Link>
        </div>

        <SupportCategories />
      </section>

      {/* ── Bottom Banner ── */}
      <section className="max-w-7xl mx-auto px-6 mt-24">
        <div
          className="relative rounded-3xl p-8 md:p-12 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-[var(--color-border)] shadow-sm"
          style={{ background: "var(--color-surface)" }}
        >
          <div className="flex-1 text-center md:text-left">
            <h3
              className="text-xl md:text-2xl font-bold mb-3"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              More from PerfumeBooth
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Read our blog for the latest perfume guides and news.
            </p>
          </div>
          <Link
            href="/blog"
            className="px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest text-white transition-all hover:shadow-xl hover:-translate-y-0.5"
            style={{ background: "var(--color-gold)" }}
          >
            Visit Our Blog
          </Link>
        </div>
      </section>
    </main>
  );
}
