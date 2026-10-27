'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Star, 
  Search, 
  Download, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  EyeOff, 
  Eye, 
  MessageSquare, 
  ShieldCheck, 
  Filter,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { apiFetch, apiDownload } from '@/lib/api';

interface ProductReviewItem {
  id: string;
  product_id: string | null;
  product_title: string;
  product_slug: string;
  product_image: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_buyer: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface ReviewsResponse {
  reviews: ProductReviewItem[];
  total: number;
  summary: {
    total_reviews: number;
    approved_count: number;
    pending_count: number;
    average_rating: number;
  };
  distribution: Record<string, number>;
}

export default function ReviewsManagementPage() {
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    total_reviews: 0,
    approved_count: 0,
    pending_count: 0,
    average_rating: 5.0
  });
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (ratingFilter !== 'all') q.set('rating', ratingFilter);
      if (searchQuery.trim()) q.set('search', searchQuery.trim());

      const res = await apiFetch<ReviewsResponse>(`/shop/admin/reviews/?${q.toString()}`);
      setReviews(res.reviews || []);
      setTotal(res.total || 0);
      setSummary(res.summary || { total_reviews: 0, approved_count: 0, pending_count: 0, average_rating: 5.0 });
      setDistribution(res.distribution || {});
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, ratingFilter, searchQuery]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    setUpdatingId(id);
    try {
      await apiFetch(`/shop/admin/reviews/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_approved: !currentStatus })
      });
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: !currentStatus } : r));
      fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Could not update review status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this customer review?')) return;
    try {
      await apiFetch(`/shop/admin/reviews/${id}/`, { method: 'DELETE' });
      setReviews(prev => prev.filter(r => r.id !== id));
      fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Could not delete review');
    }
  };

  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (ratingFilter !== 'all') q.set('rating', ratingFilter);
      const blob = await apiDownload(`/shop/admin/reviews/export/?${q.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `perfumebooth_reviews_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Could not export Excel file');
    } finally {
      setDownloading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${star <= rating ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card neu-extruded p-6 rounded-3xl border border-border/10">
        <div>
          <div className="flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Product Ratings & Feedback Studio</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Customer Reviews Management</h1>
          <p className="text-muted-foreground text-xs font-bold mt-1">
            Moderate, approve, and filter customer star ratings and written reviews across all fragrance catalog items.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-black rounded-2xl text-xs transition duration-200 cursor-pointer disabled:opacity-50 text-primary"
            title="Download formatted Excel (.xlsx) file"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{downloading ? 'Exporting…' : 'Download Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Average Rating */}
        <div className="bg-card neu-extruded p-5 rounded-3xl border border-border/10 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase text-muted-foreground">Store Average Rating</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-foreground">{summary.average_rating}</span>
            <span className="text-xs font-extrabold text-muted-foreground">/ 5.0</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            {renderStars(Math.round(summary.average_rating))}
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-card neu-extruded p-5 rounded-3xl border border-border/10 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase text-muted-foreground">Total Reviews</span>
          <div className="text-3xl font-black text-foreground mt-2">{summary.total_reviews}</div>
          <span className="text-[10px] font-bold text-muted-foreground mt-1">All time customer ratings</span>
        </div>

        {/* Approved & Live */}
        <div className="bg-card neu-extruded p-5 rounded-3xl border border-border/10 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase text-emerald-800">Live on Storefront</span>
          <div className="text-3xl font-black text-emerald-800 mt-2">{summary.approved_count}</div>
          <span className="text-[10px] font-bold text-muted-foreground mt-1">Visible to all shoppers</span>
        </div>

        {/* Pending / Hidden */}
        <div className="bg-card neu-extruded p-5 rounded-3xl border border-border/10 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase text-amber-800">Pending / Hidden</span>
          <div className="text-3xl font-black text-amber-800 mt-2">{summary.pending_count}</div>
          <span className="text-[10px] font-bold text-muted-foreground mt-1">Requires approval or hidden</span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-card neu-extruded p-4 rounded-3xl border border-border/10">
        {/* Status & Star Rating Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Status Selectors */}
          <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-2xl border border-border/20">
            {[
              { id: 'all', label: 'All' },
              { id: 'approved', label: 'Approved' },
              { id: 'pending', label: 'Pending' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'neu-inset text-primary bg-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Star Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {['all', '5', '4', '3', '2', '1'].map(val => (
              <button
                key={val}
                onClick={() => setRatingFilter(val)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  ratingFilter === val
                    ? 'neu-inset text-amber-500 border border-amber-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                {val === 'all' ? (
                  <span>All Stars</span>
                ) : (
                  <>
                    <span>{val}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  </>
                )}
                {val !== 'all' && distribution[val] !== undefined && (
                  <span className="text-[10px] opacity-70">({distribution[val]})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product, customer, or title..."
            className="w-full pl-9 pr-4 py-2 text-xs neu-input rounded-2xl font-bold"
          />
        </div>
      </div>

      {/* Reviews Table Card */}
      <div className="bg-card neu-extruded rounded-3xl border border-border/10 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-primary gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs font-bold text-muted-foreground">Loading reviews…</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-8 gap-3">
            <div className="w-16 h-16 rounded-2xl neu-inset-sm flex items-center justify-center text-muted-foreground">
              <Star className="w-8 h-8 opacity-40 text-amber-500" />
            </div>
            <h3 className="text-base font-black text-foreground">No customer reviews found</h3>
            <p className="text-xs font-bold text-muted-foreground max-w-sm">
              {searchQuery || statusFilter !== 'all' || ratingFilter !== 'all'
                ? 'Try adjusting your search filters to find other reviews.' 
                : 'Customer ratings submitted on fragrance product pages will automatically appear here for moderation.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-5">Product</th>
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Rating</th>
                  <th className="py-3.5 px-5">Review Title & Comment</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 font-medium">
                {reviews.map((rev) => {
                  const dateStr = rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : '—';

                  return (
                    <tr key={rev.id} className="hover:bg-muted/30 transition-colors">
                      {/* Product Column */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="w-10 h-10 rounded-xl bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center border border-border/20 p-1">
                            {rev.product_image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={rev.product_image} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <Star className="w-4 h-4 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-foreground truncate max-w-[180px]" title={rev.product_title}>
                              {rev.product_title}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                          </div>
                        </div>
                      </td>

                      {/* Customer Column */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-foreground flex items-center gap-1">
                            {rev.user_name}
                            {rev.is_verified_buyer && (
                              <span title="Verified Buyer" className="text-emerald-800">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-bold">{rev.user_email}</span>
                        </div>
                      </td>

                      {/* Star Rating Column */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {renderStars(rev.rating)}
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">
                            {rev.rating} of 5 Stars
                          </span>
                        </div>
                      </td>

                      {/* Review Content Column */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col max-w-md">
                          {rev.title && (
                            <span className="font-extrabold text-foreground text-xs mb-0.5">
                              {rev.title}
                            </span>
                          )}
                          <p className="text-muted-foreground text-xs leading-relaxed font-normal">
                            {rev.comment || <span className="italic opacity-60">No written feedback provided.</span>}
                          </p>
                        </div>
                      </td>

                      {/* Approval Status Badge */}
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        {rev.is_approved ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                            Live on Store
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-800 border border-amber-500/30">
                            Hidden
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={updatingId === rev.id}
                            onClick={() => handleToggleApproval(rev.id, rev.is_approved)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                              rev.is_approved
                                ? 'neu-btn text-muted-foreground hover:text-amber-500'
                                : 'neu-btn-primary text-emerald-800'
                            }`}
                            title={rev.is_approved ? 'Hide from storefront' : 'Approve and publish to storefront'}
                          >
                            {rev.is_approved ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Hide</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(rev.id)}
                            className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition cursor-pointer"
                            title="Delete review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
