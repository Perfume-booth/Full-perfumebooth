"use client";

import { useState, useEffect } from "react";
import { AnimatedStar } from "@/components/ui/icons/AnimatedStar";
import { AnimatedCheckCircle2 } from "@/components/ui/icons/AnimatedCheckCircle2";
import { AnimatedMessageSquare } from "@/components/ui/icons/AnimatedMessageSquare";
import { AnimatedX } from "@/components/ui/icons/AnimatedX";
import { AnimatedLoader2 } from "@/components/ui/icons/AnimatedLoader2";
import { AnimatedChevronDown } from "@/components/ui/icons/AnimatedChevronDown";
import { AnimatedCamera } from "@/components/ui/icons/AnimatedCamera";
import { AnimatedTrash2 } from "@/components/ui/icons/AnimatedTrash2";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ReviewData = {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  image?: string;
  images?: string[];
  isVerified: boolean;
  date?: string;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function ProductReviews({ productHandle }: { productHandle?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [displayCount, setDisplayCount] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productRating, setProductRating] = useState<number>(0);
  const [productRatingCount, setProductRatingCount] = useState<number>(0);

  // Form State
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const queryParams = new URLSearchParams();
        if (productHandle) queryParams.append("handle", productHandle);

        const res = await fetch(`/api/reviews?${queryParams.toString()}`);
        if (!res.ok) {
          console.warn("Reviews fetch returned status:", res.status);
          setReviews([]);
          return;
        }
        
        const data = await res.json();
        setReviews(data.reviews || []);
        setProductRating(data.rating || 0);
        setProductRatingCount(data.ratingCount || (data.reviews || []).length);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviews();
  }, [productHandle]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formText || !formRating) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("productHandle", productHandle || "");
      formData.append("name", formName);
      formData.append("email", formEmail);
      formData.append("text", formText);
      formData.append("rating", formRating.toString());
      
      // For this demo, we send previews (base64) as image data
      previews.forEach((preview) => {
        formData.append("images", preview);
      });

      const res = await fetch("/api/reviews", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        // Optimistic update or just push to list
        setReviews(prev => [result.review, ...prev]);
        setIsModalOpen(false);
        // Reset form
        setFormText("");
        setFormName("");
        setFormEmail("");
        setFormRating(5);
        setSelectedFiles([]);
        setPreviews([]);
      }
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating = productRating > 0 ? productRating.toFixed(1) : "0.0";
  const totalCount = productRatingCount > 0 ? productRatingCount : reviews.length;

  // Mock distribution based on the total count
  const distribution = [
    { stars: 5, count: Math.floor(totalCount * 0.85) },
    { stars: 4, count: Math.floor(totalCount * 0.10) },
    { stars: 3, count: Math.floor(totalCount * 0.03) },
    { stars: 2, count: Math.floor(totalCount * 0.01) },
    { stars: 1, count: Math.floor(totalCount * 0.01) },
  ];

  const visibleReviews = reviews.slice(0, displayCount);
  const hasMore = reviews.length > displayCount;

  return (
    <section id="product-reviews" className="bg-white py-8 md:py-10 text-[var(--color-text-primary)] border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
           
           {/* ── Left Column: Summary (Scorecard) ── */}
           <div className="w-full lg:w-1/3 lg:min-w-[300px] shrink-0">
              <div className="bg-[var(--color-bg-subtle)]/50 p-6 md:p-0 md:bg-transparent rounded-2xl border border-[var(--color-border)] md:border-0">
                <h2 className="text-xl md:text-2xl font-serif font-bold text-[var(--color-text-primary)] mb-3 md:mb-4">
                  Customer Reviews
                </h2>
                
                <div className="flex items-center gap-3 mb-3">
                   <div className="flex text-[#b8924a] scale-110 origin-left">
                      {[...Array(5)].map((_, i) => (
                         <AnimatedStar key={i} size={18} fill={i < Math.round(parseFloat(avgRating)) ? "currentColor" : "none"} stroke="currentColor" />
                      ))}
                   </div>
                   <span className="text-xs md:text-sm font-medium text-[var(--color-text-muted)]">({totalCount})</span>
                </div>

                {/* Distribution Bars - Tightened for mobile */}
                <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                  {distribution.map((item) => (
                    <div key={item.stars} className="flex items-center gap-3 md:gap-4 text-[10px] md:text-sm">
                        <span className="flex items-center gap-1 w-6 shrink-0 opacity-70 font-bold">
                           {item.stars} <AnimatedStar size={10} fill="currentColor" className="text-gray-400" />
                        </span>
                        <div className="flex-1 h-1.5 md:h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${totalCount > 0 ? (item.count / totalCount) * 100 : 0}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="h-full bg-[#b8924a]" 
                          />
                        </div>
                        <span className="text-[10px] text-[#8a7968] font-bold w-10 text-right shrink-0">
                          {totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0}%
                        </span>
                      </div>
                  ))}
                </div>

                {/* CTA Section - Mobile Optimized */}
                <div className="pt-6 md:pt-8 border-t border-gray-200/50 space-y-4">
                   <h3 className="text-md md:text-lg font-serif font-semibold">Share your thoughts</h3>
                   <p className="text-xs md:text-sm text-[#8a7968] font-light leading-relaxed">
                     If you've used this product, share your thoughts with other customers.
                   </p>
                     <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full py-4 px-6 bg-[#1a1410] md:bg-transparent border border-[#1a1410] md:hover:bg-gray-50 text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold text-white md:text-[var(--color-text-primary)] transition-all duration-300 rounded-lg shadow-sm flex items-center justify-center gap-2"
                     >
                        Write a review
                     </button>
                   </div>
                </div>
              </div>

           {/* ── Right Column: Reviews List ── */}
           <div className="flex-1">
              <div className="divide-y divide-gray-100 border-t border-gray-100 lg:border-t-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                     <AnimatedLoader2 size={32} className="animate-spin text-[#b8924a] mb-4" />
                     <span className="text-[10px] uppercase tracking-widest text-[#8a7968]">Gathering reviews...</span>
                  </div>
                ) : reviews.length > 0 ? (
                  <>
                    {visibleReviews.map((review, idx) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 }}
                        className="py-3.5 md:py-4.5"
                      >
                        <div className="flex items-start gap-3 md:gap-4 mb-3">
                           <div className="size-8 md:size-10 rounded-full bg-gray-50 shrink-0 overflow-hidden flex items-center justify-center border border-gray-100">
                                {review.image ? (
                                  <Image 
                                    src={review.image} 
                                    alt={review.name} 
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-gray-500">{review.name[0]}</span>
                                )}
                             </div>
                             <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">{review.name}</h4>
                                  {review.date && (
                                    <span className="text-xs text-[var(--color-text-muted)] font-light">{formatDate(review.date)}</span>
                                  )}
                                </div>
                                <div className="flex text-[#b8924a] mt-1 mb-2">
                                   {[...Array(5)].map((_, i) => (
                                      <AnimatedStar key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} stroke="currentColor" />
                                   ))}
                                </div>
                                <div className="text-[15px] text-[#4a4038] font-light leading-relaxed italic md:not-italic">
                                   &ldquo;{review.text}&rdquo;
                                </div>

                                {/* Review Images */}
                                {(review.images && review.images.length > 0) && (
                                  <div className="flex flex-wrap gap-2 mt-4">
                                     {review.images.map((img, i) => (
                                       <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-100 group cursor-pointer">
                                         <Image 
                                           src={img} 
                                           alt={`Review image ${i+1}`} 
                                           fill 
                                           className="object-cover transition-transform duration-500 group-hover:scale-110" 
                                         />
                                       </div>
                                     ))}
                                  </div>
                                )}

                                {review.isVerified && (
                                   <span className="inline-flex items-center gap-1.5 mt-4 text-[9px] uppercase tracking-widest text-[#63826b] font-bold">
                                      <AnimatedCheckCircle2 size={12} /> Verified Purchase
                                   </span>
                                )}
                             </div>
                          </div>
                        </motion.div>
                      ))}

                      {hasMore && (
                        <div className="pt-8 flex justify-center lg:justify-start">
                          <button
                             onClick={() => setDisplayCount(prev => prev + 5)}
                             className="group flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-bold text-[#b8924a] hover:text-black transition-colors"
                          >
                             Read more reviews <AnimatedChevronDown size={14} className="group-hover:translate-y-1 transition-transform" />
                          </button>
                        </div>
                      )}
                    </>
                 ) : (
                    <div className="py-20 text-center text-[#8a7968] font-light italic">
                       No reviews yet. Be the first to share your experience.
                    </div>
                 )}
              </div>
           </div>

        </div>
      </div>

      {/* Write a Review Modal (Tailwind style) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-xl p-10 relative shadow-2xl rounded-2xl border border-gray-100"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-black hover:text-white transition-all"
              >
                <AnimatedX size={18} />
              </button>

              <div className="mb-10 text-center lg:text-left">
                <h3 className="text-2xl font-serif text-[var(--color-text-primary)] mb-2 font-bold">Write a review</h3>
                <p className="text-sm text-[#8a7968] font-light">Share your thoughts with other customers.</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-primary)] font-bold mb-3">Overall Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormRating(s)}
                          onMouseEnter={() => setFormRating(s)}
                          className="focus:outline-none"
                        >
                          <AnimatedStar 
                            size={24} 
                            className={cn(
                              "transition-all duration-200",
                              s <= formRating ? "text-[#b8924a] scale-110" : "text-gray-200"
                            )}
                            fill={s <= formRating ? "currentColor" : "none"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 max-w-[200px]">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-primary)] font-bold mb-3">Post Images</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex items-center gap-2 py-2 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-[9px] uppercase tracking-widest font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                        <AnimatedCamera size={16} /> Add Photos
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Previews */}
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    {previews.map((preview, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white shadow-sm group">
                        <Image src={preview} alt="Preview" fill className="object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <AnimatedTrash2 size={16} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                   <label className="block text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-primary)] font-bold">Review Text</label>
                   <textarea 
                     rows={4} 
                     className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:bg-white focus:border-[#b8924a] outline-none text-sm transition-all resize-none font-light" 
                     placeholder="How did it smell? Was the packaging premium?" 
                     value={formText}
                     onChange={(e) => setFormText(e.target.value)}
                     required 
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-primary)] font-bold">Public Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rahul S." 
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg py-3 px-4 focus:bg-white focus:border-[#b8924a] outline-none text-sm transition-colors" 
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-primary)] font-bold">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="rahul@example.com" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg py-3 px-4 focus:bg-white focus:border-[#b8924a] outline-none text-sm transition-colors" 
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[var(--color-text-primary)] text-white text-[11px] uppercase tracking-[0.25em] font-bold hover:bg-[#b8924a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all rounded-lg mt-4 shadow-lg shadow-black/5 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <AnimatedLoader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : "Submit Review"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
