"use client";

import { useState } from "react";
import HeroBanner from "@/components/home/HeroBanner";
import ProductCarousel from "@/components/home/ProductCarousel";
import { Star, ChevronDown, ChevronUp } from "lucide-react";

interface CMSSection {
  id: string;
  type: "HeroBanner" | "ProductGrid" | "Testimonials" | "RichText" | "FaqList" | "ContactCard";
  sort_order: number;
  content: Record<string, any>;
  is_visible: boolean;
}

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  meta_title?: string;
  meta_description?: string;
  is_published: boolean;
  sections: CMSSection[];
}

export default function CMSPageRenderer({ page }: { page: CMSPage }) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  if (!page || !page.sections) return null;

  const visibleSections = page.sections
    .filter((s) => s.is_visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen pb-20 bg-black text-white">
      {visibleSections.map((section, idx) => {
        const { type, content } = section;

        if (type === "HeroBanner") {
          return (
            <HeroBanner
              key={section.id || idx}
              title={content.title}
              subtitle={content.subtitle}
              imageUrl={content.backgroundImage || undefined}
              slides={
                content.backgroundImage
                  ? [
                      {
                        id: section.id,
                        image: content.backgroundImage,
                        href: content.buttonLink || "/products",
                        alt_text: content.title,
                      },
                    ]
                  : []
              }
            />
          );
        }

        if (type === "ProductGrid") {
          return (
            <section key={section.id || idx} className="max-w-7xl mx-auto px-4 py-12">
              {content.title && (
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-4xl font-serif text-[var(--color-gold)]">
                    {content.title}
                  </h2>
                </div>
              )}
              <ProductCarousel products={content.products || []} title={content.title || "Featured Fragrances"} />
            </section>
          );
        }

        if (type === "Testimonials") {
          const reviews = content.reviews || [];
          return (
            <section key={section.id || idx} className="max-w-7xl mx-auto px-4 py-16 bg-white/[0.02] border-y border-white/10">
              <h2 className="text-2xl md:text-4xl font-serif text-center text-[var(--color-gold)] mb-12">
                {content.title || "Customer Stories"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reviews.map((rev: any, rIdx: number) => (
                  <div key={rIdx} className="p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between gap-4">
                    <p className="text-sm text-gray-300 italic">"{rev.quote}"</p>
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="font-semibold text-white text-sm">{rev.name}</span>
                      <div className="flex gap-1 text-[var(--color-gold)]">
                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                          <Star key={i} size={14} fill="currentColor" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (type === "ContactCard") {
          return (
            <section key={section.id || idx} className="max-w-6xl mx-auto px-6 py-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {content.email && (
                  <div className="p-8 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full border border-[var(--color-gold)] text-[var(--color-gold)] flex items-center justify-center mb-4 text-xl">
                      📧
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Email Support</h3>
                    <a href={`mailto:${content.email}`} className="text-sm font-serif text-[var(--color-gold)] underline">
                      {content.email}
                    </a>
                  </div>
                )}

                {content.phone && (
                  <div className="p-8 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-gold)] text-black flex items-center justify-center mb-4 text-xl font-bold">
                      📞
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Call & WhatsApp</h3>
                    <p className="text-sm font-serif text-gray-200">{content.phone}</p>
                    {content.hours && <span className="text-[11px] text-gray-400 mt-1">{content.hours}</span>}
                  </div>
                )}

                {content.address && (
                  <div className="p-8 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full border border-[var(--color-gold)] text-[var(--color-gold)] flex items-center justify-center mb-4 text-xl">
                      📍
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Visit Us</h3>
                    <p className="text-sm font-serif text-gray-300 leading-relaxed max-w-[220px]">{content.address}</p>
                  </div>
                )}
              </div>
            </section>
          );
        }

        if (type === "RichText") {
          const paragraphs = (content.body || "").split("\n\n");
          return (
            <section key={section.id || idx} className="max-w-4xl mx-auto px-6 py-16">
              {content.title && (
                <h1 className="text-3xl md:text-5xl font-serif text-[var(--color-gold)] mb-8 text-center">
                  {content.title}
                </h1>
              )}
              <div className="space-y-6 text-gray-300 leading-relaxed text-base">
                {paragraphs.map((p: string, pIdx: number) => {
                  if (p.startsWith("### ")) {
                    return (
                      <h3 key={pIdx} className="text-xl md:text-2xl font-serif text-white font-bold mt-8 mb-3">
                        {p.replace("### ", "")}
                      </h3>
                    );
                  }
                  // Render inner tags like <gold> and **bold**
                  const formatted = p
                    .replace(/<gold>(.*?)<\/gold>/g, '<span class="text-[var(--color-gold)] font-semibold">$1</span>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-200">$1</em>');

                  return (
                    <p key={pIdx} className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: formatted }} />
                  );
                })}
              </div>
            </section>
          );
        }

        if (type === "FaqList") {
          const faqs = content.faqs || [];
          return (
            <section key={section.id || idx} className="max-w-4xl mx-auto px-6 py-16">
              {content.title && (
                <h2 className="text-2xl md:text-4xl font-serif text-[var(--color-gold)] mb-10 text-center">
                  {content.title}
                </h2>
              )}
              <div className="space-y-4">
                {faqs.map((faq: any, fIdx: number) => {
                  const isOpen = openFaqIdx === fIdx;
                  return (
                    <div key={fIdx} className="border border-white/10 bg-white/5 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setOpenFaqIdx(isOpen ? null : fIdx)}
                        className="w-full p-6 text-left font-medium text-white flex justify-between items-center gap-4 hover:bg-white/5 transition-colors"
                      >
                        <span className="text-base md:text-lg">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-[var(--color-gold)] shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-6 text-gray-300 text-sm leading-relaxed border-t border-white/5 pt-4">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
