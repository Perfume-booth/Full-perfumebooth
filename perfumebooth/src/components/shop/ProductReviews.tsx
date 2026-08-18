'use client';

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, MessageSquare, ThumbsUp, Send, Loader2 } from 'lucide-react';

interface Review {
  id: string;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_buyer: boolean;
  created_at: string;
}

interface ReviewData {
  product_id: string;
  average_rating: number;
  review_count: number;
  rating_distribution: Record<number, number>;
  reviews: Review[];
}

interface ProductReviewsProps {
  productId: string;
  productTitle: string;
}

export default function ProductReviews({ productId, productTitle }: ProductReviewsProps) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews/${productId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch reviews', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchReviews();
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !comment.trim()) return;

    try {
      setSubmitting(true);
      setMessage(null);

      const res = await fetch(`/api/reviews/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, comment })
      });

      const json = await res.json();
      if (res.ok) {
        setMessage('Review submitted successfully!');
        setTitle('');
        setComment('');
        setModalOpen(false);
        fetchReviews();
      } else {
        setMessage(json.detail || 'Failed to submit review. Please log in first.');
      }
    } catch (e) {
      setMessage('Error submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading customer reviews...
      </div>
    );
  }

  const reviews = data?.reviews || [];
  const avg = data?.average_rating || 5.0;
  const count = data?.review_count || 0;
  const dist = data?.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  return (
    <section className="py-12 border-t border-border mt-16">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Customer Ratings & Reviews</h2>
            <p className="text-sm text-muted-foreground">Real reviews from verified fragrance connoisseurs</p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" /> Write a Review
          </button>
        </div>

        {/* Rating Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-secondary/20 p-6 rounded-2xl border border-border">
          {/* Average Rating Box */}
          <div className="flex flex-col items-center justify-center p-4 border-r border-border/50 text-center">
            <span className="text-5xl font-serif font-bold text-foreground">{avg}</span>
            <div className="flex items-center gap-1 my-2 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= Math.round(avg) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-medium">Based on {count} {count === 1 ? 'review' : 'reviews'}</span>
          </div>

          {/* Distribution Bars */}
          <div className="md:col-span-2 flex flex-col gap-2 justify-center">
            {[5, 4, 3, 2, 1].map((num) => {
              const numCount = dist[num] || 0;
              const pct = count > 0 ? (numCount / count) * 100 : 0;
              return (
                <div key={num} className="flex items-center gap-3 text-xs">
                  <span className="w-12 text-muted-foreground font-medium flex items-center gap-1">
                    {num} <Star className="w-3 h-3 fill-amber-500 text-amber-500 inline" />
                  </span>
                  <div className="flex-1 bg-secondary h-2.5 rounded-full overflow-hidden border border-border">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-muted-foreground font-mono">{numCount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div className="p-4 bg-primary/10 text-primary text-xs rounded-xl border border-primary/20 flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="font-bold underline cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Review List */}
        <div className="flex flex-col gap-6">
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm bg-secondary/10 rounded-xl border border-border">
              No reviews yet for {productTitle}. Be the first to share your scent journey experience!
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="p-6 bg-card rounded-2xl border border-border flex flex-col gap-3 shadow-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{rev.user_name}</span>
                      {rev.is_verified_buyer && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified Buyer
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Reviewed on {new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                  </div>
                </div>

                {rev.title && <h4 className="font-semibold text-sm text-foreground">{rev.title}</h4>}
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card max-w-lg w-full p-6 rounded-2xl border border-border shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h3 className="text-lg font-serif font-bold text-foreground">Write a Review for {productTitle}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Your Rating</label>
                <div className="flex items-center gap-2 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className={`w-7 h-7 cursor-pointer transition-transform hover:scale-110 ${
                        star <= (hoverRating || rating) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2 font-medium">({hoverRating || rating} of 5 Stars)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Headline / Title</label>
                <input
                  type="text"
                  placeholder="e.g., Long lasting & seductive Oud scent!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-3 bg-secondary/30 border border-border rounded-xl text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Written Review</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share details about longevity, projection, sillage, and scent notes..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full text-xs p-3 bg-secondary/30 border border-border rounded-xl text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-secondary text-foreground text-xs font-semibold rounded-xl hover:bg-secondary/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 flex items-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
