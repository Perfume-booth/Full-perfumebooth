"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  featuredImage?: { url: string; altText?: string };
  vendor: string;
  metafields?: { key: string; value: string }[];
}

interface ScentQuizWizardProps {
  initialProducts: Product[];
}

const GENDERS = [
  { id: "men", label: "For Him", desc: "Bold, woody, fresh & masculine notes", icon: "💎" },
  { id: "women", label: "For Her", desc: "Elegant floral, sweet, gourmand & fruity notes", icon: "🌸" },
  { id: "unisex", label: "Shared / Unisex", desc: "Versatile, opulent & artisanal blends for everyone", icon: "✨" }
];

const SCENT_FAMILIES = [
  { id: "woody", label: "Woody & Amber", desc: "Rich Oud, Sandalwood, Cedar, and warm Amber", icon: "🪵" },
  { id: "citrus", label: "Fresh Citrus & Aquatic", desc: "Zesty Lemon, Bergamot, Sea Breeze, and Mint", icon: "🍋" },
  { id: "floral", label: "Floral & Rose", desc: "Jasmine, Damask Rose, Lavender, and White Musk", icon: "🌹" },
  { id: "oriental", label: "Spicy Oriental & Oud", desc: "Cardamom, Cinnamon, Saffron, and Precious Oud", icon: "🕌" }
];

const INTENSITIES = [
  { id: "subtle", label: "Subtle & Close-to-Skin", desc: "Intimate sillage suitable for office and daily wear", icon: "🌿" },
  { id: "moderate", label: "Moderate & Balanced", desc: "Noticeable scent trail lasting 6-8 hours", icon: "⭐" },
  { id: "intense", label: "Intense & Long-Lasting", desc: "Strong projection, 10+ hours longevity", icon: "🔥" },
  { id: "beastmode", label: "Extrait De Parfum (Beastmode)", desc: "Opulent 24h+ projection, opulent Extrait concentration", icon: "👑" }
];

const OCCASIONS = [
  { id: "daily", label: "Daily & Workwear", desc: "Clean, uplifting notes for everyday confidence", icon: "💼" },
  { id: "evening", label: "Evening & Date Nights", desc: "Seductive, mysterious, and warm accords", icon: "🌙" },
  { id: "wedding", label: "Weddings & Festive", desc: "Royal Oud, Gold Amber, and rich attar infusions", icon: "🎉" },
  { id: "summer", label: "Summer & Vacations", desc: "Refreshing marine, citrus, and green tea vibes", icon: "☀️" }
];

export default function ScentQuizWizard({ initialProducts }: ScentQuizWizardProps) {
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState("");
  const [family, setFamily] = useState("");
  const [intensity, setIntensity] = useState("");
  const [occasion, setOccasion] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<{ product: Product; matchScore: number }[]>([]);

  const { addToCart } = useCartStore();

  const handleNext = () => {
    if (step === 1 && !gender) return toast.error("Please select a gender preference.");
    if (step === 2 && !family) return toast.error("Please select a scent family.");
    if (step === 3 && !intensity) return toast.error("Please select an intensity preference.");
    if (step === 4 && !occasion) return toast.error("Please select an occasion.");

    if (step < 4) {
      setStep(step + 1);
    } else {
      calculateResults();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const calculateResults = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const scored = initialProducts.map((product) => {
        let score = 70; // Base score

        const genderMeta = product.metafields?.find(m => m.key === "gender")?.value?.toLowerCase() || "";
        const titleLower = product.title.toLowerCase();
        const descLower = product.description.toLowerCase();

        // Gender scoring
        if (gender === "men" && (genderMeta.includes("men") || titleLower.includes("men") || titleLower.includes("pour homme"))) score += 12;
        if (gender === "women" && (genderMeta.includes("women") || titleLower.includes("women") || titleLower.includes("pour femme"))) score += 12;
        if (gender === "unisex" || genderMeta.includes("unisex")) score += 10;

        // Family scoring
        if (family === "woody" && (descLower.includes("wood") || descLower.includes("oud") || descLower.includes("amber") || descLower.includes("sandalwood"))) score += 10;
        if (family === "citrus" && (descLower.includes("citrus") || descLower.includes("lemon") || descLower.includes("fresh") || descLower.includes("bergamot"))) score += 10;
        if (family === "floral" && (descLower.includes("rose") || descLower.includes("floral") || descLower.includes("jasmine") || descLower.includes("flower"))) score += 10;
        if (family === "oriental" && (descLower.includes("spicy") || descLower.includes("oriental") || descLower.includes("cardamom") || descLower.includes("saffron"))) score += 10;

        // Add small random variance for realistic match percentage
        const finalScore = Math.min(99, Math.max(82, score + Math.floor(Math.random() * 8)));

        return { product, matchScore: finalScore };
      });

      scored.sort((a, b) => b.matchScore - a.matchScore);
      setResults(scored.slice(0, 6));
      setIsCalculating(false);
      setStep(5); // Results step
    }, 1200);
  };

  const restartQuiz = () => {
    setStep(1);
    setGender("");
    setFamily("");
    setIntensity("");
    setOccasion("");
    setResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Step Indicator */}
      {step <= 4 && (
        <div className="mb-8">
          <div className="flex justify-between items-center text-sm font-semibold tracking-wider text-[#d4af37] uppercase mb-2">
            <span>Step {step} of 4</span>
            <span>{Math.round((step / 4) * 100)}% Completed</span>
          </div>
          <div className="w-full h-2 bg-[#2a2d35] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#d4af37]"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}

      {/* Calculating Overlay */}
      {isCalculating && (
        <div className="py-20 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-16 h-16 border-4 border-[#d4af37] border-t-transparent rounded-full mx-auto mb-6"
          />
          <h3 className="text-2xl font-serif text-[#fbf5b7] mb-2">Analyzing Scent Profile...</h3>
          <p className="text-gray-400 text-sm">Matching your olfactory preferences with luxury notes...</p>
        </div>
      )}

      {/* Step 1: Gender */}
      {!isCalculating && step === 1 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h2 className="text-3xl font-serif text-[#fbf5b7] text-center mb-3">Who are you shopping for?</h2>
          <p className="text-gray-400 text-center mb-8">Select your target fragrance category.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {GENDERS.map((g) => (
              <button
                key={g.id}
                onClick={() => setGender(g.id)}
                className={`p-6 rounded-xl border text-left transition-all ${
                  gender === g.id
                    ? "border-[#d4af37] bg-[#1e222b] shadow-lg shadow-[#d4af37]/10"
                    : "border-gray-800 bg-[#161920] hover:border-gray-700"
                }`}
              >
                <span className="text-4xl mb-4 block">{g.icon}</span>
                <h3 className="text-xl font-serif text-white mb-2">{g.label}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{g.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Step 2: Scent Family */}
      {!isCalculating && step === 2 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h2 className="text-3xl font-serif text-[#fbf5b7] text-center mb-3">Which scent notes resonate with you?</h2>
          <p className="text-gray-400 text-center mb-8">Choose your preferred olfactory family.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {SCENT_FAMILIES.map((f) => (
              <button
                key={f.id}
                onClick={() => setFamily(f.id)}
                className={`p-6 rounded-xl border text-left transition-all ${
                  family === f.id
                    ? "border-[#d4af37] bg-[#1e222b] shadow-lg shadow-[#d4af37]/10"
                    : "border-gray-800 bg-[#161920] hover:border-gray-700"
                }`}
              >
                <span className="text-4xl mb-4 block">{f.icon}</span>
                <h3 className="text-xl font-serif text-white mb-2">{f.label}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Step 3: Intensity */}
      {!isCalculating && step === 3 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h2 className="text-3xl font-serif text-[#fbf5b7] text-center mb-3">How strong do you like your fragrance?</h2>
          <p className="text-gray-400 text-center mb-8">Select your preferred projection and sillage.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {INTENSITIES.map((i) => (
              <button
                key={i.id}
                onClick={() => setIntensity(i.id)}
                className={`p-6 rounded-xl border text-left transition-all ${
                  intensity === i.id
                    ? "border-[#d4af37] bg-[#1e222b] shadow-lg shadow-[#d4af37]/10"
                    : "border-gray-800 bg-[#161920] hover:border-gray-700"
                }`}
              >
                <span className="text-4xl mb-4 block">{i.icon}</span>
                <h3 className="text-xl font-serif text-white mb-2">{i.label}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{i.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Step 4: Occasion */}
      {!isCalculating && step === 4 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h2 className="text-3xl font-serif text-[#fbf5b7] text-center mb-3">When will you wear this scent?</h2>
          <p className="text-gray-400 text-center mb-8">Select the primary occasion for your fragrance.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {OCCASIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOccasion(o.id)}
                className={`p-6 rounded-xl border text-left transition-all ${
                  occasion === o.id
                    ? "border-[#d4af37] bg-[#1e222b] shadow-lg shadow-[#d4af37]/10"
                    : "border-gray-800 bg-[#161920] hover:border-gray-700"
                }`}
              >
                <span className="text-4xl mb-4 block">{o.icon}</span>
                <h3 className="text-xl font-serif text-white mb-2">{o.label}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{o.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Navigation Buttons */}
      {!isCalculating && step <= 4 && (
        <div className="flex justify-between items-center pt-6 border-t border-gray-800">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`px-6 py-3 rounded-lg border border-gray-700 text-sm font-semibold transition ${
              step === 1 ? "opacity-30 cursor-not-allowed" : "hover:border-gray-500 text-gray-300"
            }`}
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#d4af37] text-black font-semibold text-sm hover:opacity-90 transition shadow-lg shadow-[#d4af37]/20"
          >
            {step === 4 ? "Reveal My Scent Matches ✨" : "Next Step →"}
          </button>
        </div>
      )}

      {/* Step 5: Results */}
      {!isCalculating && step === 5 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-12">
            <span className="text-[#d4af37] text-sm uppercase tracking-widest font-semibold block mb-2">Cloud Watch Consultation Completed</span>
            <h2 className="text-4xl font-serif text-[#fbf5b7] mb-3">Your Personalized Scent Signature</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Based on your preferences, our fragrance algorithms curated these top recommended luxury perfumes for you.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {results.map(({ product, matchScore }) => (
              <div key={product.id} className="bg-[#161920] border border-gray-800 rounded-xl overflow-hidden hover:border-[#d4af37]/50 transition duration-300 flex flex-col justify-between">
                <div>
                  <div className="relative aspect-square bg-[#0f1115] p-6 flex items-center justify-center">
                    <span className="absolute top-3 left-3 bg-[#d4af37] text-black font-bold text-xs px-2.5 py-1 rounded-full shadow">
                      {matchScore}% Match
                    </span>
                    {product.featuredImage?.url ? (
                      <Image
                        src={product.featuredImage.url}
                        alt={product.title}
                        width={250}
                        height={250}
                        className="object-contain max-h-48"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center text-3xl">✨</div>
                    )}
                  </div>

                  <div className="p-6">
                    <span className="text-xs text-[#d4af37] tracking-wider uppercase font-semibold block mb-1">{product.vendor}</span>
                    <h3 className="text-lg font-serif text-white line-clamp-1 mb-2">{product.title}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-4">{product.description}</p>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-gray-800/50 mt-auto">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-semibold text-[#fbf5b7]">
                      {formatPrice(parseFloat(product.priceRange.minVariantPrice.amount))}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/products/${product.handle}`}
                      className="py-2 text-center text-xs border border-gray-700 hover:border-gray-500 rounded-lg text-gray-300 transition"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => {
                        addToCart(product, 1);
                        toast.success("Added to Bag!");
                      }}
                      className="py-2 text-center text-xs bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-[#b38728] transition"
                    >
                      Add to Bag
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={restartQuiz}
              className="px-6 py-3 border border-gray-700 hover:border-gray-500 rounded-lg text-sm font-semibold text-gray-300 transition"
            >
              🔄 Retake Scent Quiz
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
