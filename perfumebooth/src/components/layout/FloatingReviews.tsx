"use client";

import { useState, useEffect } from "react";
import { AnimatedStar } from "@/components/ui/icons/AnimatedStar";
import { AnimatedX } from "@/components/ui/icons/AnimatedX";
import { AnimatedCheckCircle2 } from "@/components/ui/icons/AnimatedCheckCircle2";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

type ReviewData = {
  id: string;
  name: string;
  rating: number;
  text: string;
  isVerified: boolean;
};

export default function FloatingReviews() {
  const pathname = usePathname();
  const [showToastReviews, setShowToastReviews] = useState(false);
  const [reviews, setReviews] = useState<ReviewData[]>([]);

  const getProductHandle = () => {
    if (pathname && pathname.startsWith("/products/")) {
      const parts = pathname.split("/");
      return parts[parts.length - 1];
    }
    return null;
  };

  useEffect(() => {
    async function fetchReviews() {
      try {
        const handle = getProductHandle();
        const url = handle ? `/api/reviews?handle=${handle}` : "/api/reviews";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // Filter for positive reviews (rating >= 4)
          const positive = (data.reviews || []).filter((r: any) => r.rating >= 4);
          setReviews(positive.slice(0, 10));
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    }
    fetchReviews();
  }, [pathname]);

  return (
    <>
      {/* Floating Review Tab on Right Side (Vertical Tab - Bottom Positioned) */}
      <button
        onClick={() => setShowToastReviews(prev => !prev)}
        className="fixed bottom-48 right-0 z-50 flex flex-col items-center gap-2 py-5 px-2.5 bg-[var(--color-gold)] text-white shadow-2xl rounded-l-2xl hover:pl-3.5 transition-all duration-300 cursor-pointer select-none"
        title="View Customer Reviews"
      >
        <AnimatedStar size={14} fill="currentColor" className="text-white shrink-0 mb-1" />
        <span className="text-[10px] uppercase tracking-[0.25em] font-extrabold [writing-mode:vertical-lr] rotate-180 leading-none">
          Reviews
        </span>
      </button>

      {/* Top Positive Reviews Toast Card */}
      <AnimatePresence>
        {showToastReviews && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 50 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100, y: 50 }}
            className="fixed bottom-24 right-4 sm:right-10 z-[250] w-[calc(100vw-32px)] sm:w-[350px] max-h-[500px] bg-white border border-[#d1c5b3]/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 bg-[#1a1410] text-white border-b border-[#d1c5b3]/20">
              <div className="flex items-center gap-2">
                <AnimatedStar size={16} className="text-[#b8924a]" fill="currentColor" />
                <h4 className="text-xs uppercase tracking-widest font-bold">Top Reviews</h4>
              </div>
              <button
                onClick={() => setShowToastReviews(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <AnimatedX size={14} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[380px] scrollbar-thin">
              {reviews.map((review) => (
                <div key={review.id} className="pb-3 border-b border-gray-100 last:border-b-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#1a1410]">{review.name}</span>
                    <span className="text-[10px] text-[#63826b] font-bold flex items-center gap-1">
                      <AnimatedCheckCircle2 size={10} /> Verified
                    </span>
                  </div>
                  <div className="flex text-[#b8924a] mb-1">
                    {[...Array(5)].map((_, i) => (
                      <AnimatedStar key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} stroke="currentColor" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
