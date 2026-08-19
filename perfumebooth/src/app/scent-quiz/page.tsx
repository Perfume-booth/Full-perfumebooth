import { Metadata } from "next";
import ScentQuizWizard from "@/components/scent-quiz/ScentQuizWizard";
import { getProducts } from "@/lib/backend/products";

export const metadata: Metadata = {
  title: "Cloud Watch Scent Finder & Consultation | PerfumeBooth",
  description: "Discover your ideal luxury perfume signature using our interactive scent quiz wizard based on olfactory notes, intensity, and occasion.",
};

export default async function ScentQuizPage() {
  const products = await getProducts(50);

  return (
    <main className="min-h-screen bg-[#0d0f12] text-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-serif text-[#fbf5b7] mb-3">
          Cloud Watch — Scent Consultation
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
          Answer 4 simple questions to let our fragrance algorithms match your unique personality with the perfect artisanal perfume.
        </p>
      </div>

      <ScentQuizWizard initialProducts={products} />
    </main>
  );
}
