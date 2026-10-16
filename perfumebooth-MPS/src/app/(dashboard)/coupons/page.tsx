'use client';

import { useState, useEffect } from 'react';
import { 
  Ticket, 
  CheckCircle, 
  Search, 
  Plus, 
  Trash2, 
  Loader2, 
  Edit2, 
  TrendingUp,
  Percent,
  IndianRupee,
  Truck,
  Copy,
  Check,
  X,
  Clock
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed' | 'free_shipping';
  discount_value: string;
  min_order_value: string;
  max_discount: string | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  first_order_only: boolean;
  created_at: string;
}

interface Metrics {
  total_coupons: number;
  active_coupons: number;
  total_redemptions: number;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total_coupons: 0,
    active_coupons: 0,
    total_redemptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage');
  const [formValue, setFormValue] = useState('10');
  const [formMinOrder, setFormMinOrder] = useState('0');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formUsageLimit, setFormUsageLimit] = useState('');
  const [formFirstOrder, setFormFirstOrder] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await apiFetch(`/orders/merchant/coupons/?${params.toString()}`);
      if (res) {
        setCoupons(res.coupons || []);
        if (res.metrics) setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [searchQuery, statusFilter]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await apiFetch(`/orders/merchant/coupons/${id}/toggle/`, { method: 'POST' });
      fetchCoupons();
    } catch (err) {
      console.error('Toggle status failed:', err);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return;
    try {
      await apiFetch(`/orders/merchant/coupons/${id}/`, { method: 'DELETE' });
      fetchCoupons();
    } catch (err) {
      console.error('Delete coupon failed:', err);
    }
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormDescription('');
    setFormType('percentage');
    setFormValue('10');
    setFormMinOrder('0');
    setFormMaxDiscount('');
    setFormEndDate('');
    setFormUsageLimit('');
    setFormFirstOrder(false);
    setFormIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setFormCode(c.code);
    setFormDescription(c.description || '');
    setFormType(c.discount_type);
    setFormValue(c.discount_value);
    setFormMinOrder(c.min_order_value || '0');
    setFormMaxDiscount(c.max_discount || '');
    setFormEndDate(c.end_date ? c.end_date.split('T')[0] : '');
    setFormUsageLimit(c.usage_limit ? String(c.usage_limit) : '');
    setFormFirstOrder(c.first_order_only);
    setFormIsActive(c.is_active);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    const payload = {
      code: formCode.trim().toUpperCase(),
      description: formDescription.trim(),
      discount_type: formType,
      discount_value: formType === 'free_shipping' ? 0 : parseFloat(formValue) || 0,
      min_order_value: parseFloat(formMinOrder) || 0,
      max_discount: formMaxDiscount ? parseFloat(formMaxDiscount) : null,
      end_date: formEndDate ? `${formEndDate}T23:59:59Z` : null,
      usage_limit: formUsageLimit ? parseInt(formUsageLimit, 10) : null,
      first_order_only: formFirstOrder,
      is_active: formIsActive,
    };

    try {
      if (editingCoupon) {
        await apiFetch(`/orders/merchant/coupons/${editingCoupon.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/orders/merchant/coupons/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neu-inset-sm flex items-center justify-center text-primary">
                <Ticket className="w-5 h-5" />
              </div>
              Coupons & Promotions
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-primary">
              Vouchers
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Create discount vouchers, manage marketing campaigns, and configure redemption rules.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-bold rounded-2xl transition-all text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-primary">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Coupons</p>
            <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{metrics.total_coupons}</h3>
          </div>
        </div>

        <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-emerald-500">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Campaigns</p>
            <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{metrics.active_coupons}</h3>
          </div>
        </div>

        <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-amber-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Redemptions</p>
            <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{metrics.total_redemptions}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card neu-extruded border border-border/10 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search coupon code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          {(['all', 'active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'neu-inset-sm text-primary'
                  : 'neu-btn text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'all' ? 'All Coupons' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-card neu-extruded border border-border/10 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm font-semibold">Loading promotions...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Ticket className="w-12 h-12 mx-auto stroke-[1.2] opacity-40 text-primary" />
            <p className="font-bold text-base text-foreground">No coupons found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto font-medium">
              Create your first promotional discount code to incentivize customer orders.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 neu-btn-primary text-xs font-bold rounded-2xl cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Coupon</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  <th className="py-4 px-5">Coupon Code</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Discount</th>
                  <th className="py-4 px-4">Min Spend</th>
                  <th className="py-4 px-4">Redemptions</th>
                  <th className="py-4 px-4">Expiry Date</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                    {/* Code & Description */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-xs tracking-wide neu-inset-sm px-2.5 py-1 rounded-xl">
                          {c.code}
                        </span>
                        <button
                          onClick={() => handleCopy(c.code)}
                          title="Copy Code"
                          className="p-1.5 neu-btn rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          {copiedCode === c.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate font-medium">{c.description}</p>
                      )}
                      {c.first_order_only && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-amber-500 neu-inset-sm px-2.5 py-0.5 rounded-full">
                          First Order Only
                        </span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-4 px-4">
                      {c.discount_type === 'percentage' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-blue-500">
                          <Percent className="w-3 h-3" /> Percentage
                        </span>
                      )}
                      {c.discount_type === 'fixed' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-emerald-500">
                          <IndianRupee className="w-3 h-3" /> Fixed Amount
                        </span>
                      )}
                      {c.discount_type === 'free_shipping' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-purple-500">
                          <Truck className="w-3 h-3" /> Free Shipping
                        </span>
                      )}
                    </td>

                    {/* Value */}
                    <td className="py-4 px-4 font-extrabold text-foreground">
                      {c.discount_type === 'percentage' && `${c.discount_value}% OFF`}
                      {c.discount_type === 'fixed' && `₹${c.discount_value} OFF`}
                      {c.discount_type === 'free_shipping' && 'Free Delivery'}
                      {c.max_discount && (
                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Cap: ₹{c.max_discount}</p>
                      )}
                    </td>

                    {/* Min Spend */}
                    <td className="py-4 px-4 text-muted-foreground text-xs font-bold">
                      {parseFloat(c.min_order_value) > 0 ? `₹${c.min_order_value}` : 'No minimum'}
                    </td>

                    {/* Redemptions */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-foreground text-xs">
                        {c.times_used}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        {c.usage_limit ? ` / ${c.usage_limit}` : ' / ∞'}
                      </span>
                    </td>

                    {/* Expiry Date */}
                    <td className="py-4 px-4 text-xs text-muted-foreground font-medium">
                      {c.end_date ? (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                          {new Date(c.end_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">Never expires</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(c.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm transition-all cursor-pointer ${
                          c.is_active
                            ? 'text-emerald-500'
                            : 'text-zinc-500'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                        {c.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Coupon"
                          className="p-2 neu-btn text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.code)}
                          title="Delete Coupon"
                          className="p-2 neu-btn text-muted-foreground hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card neu-extruded border border-border/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4.5 border-b border-border/30 flex items-center justify-between bg-muted/20">
              <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl neu-inset-sm flex items-center justify-center text-primary">
                  <Ticket className="w-4 h-4" />
                </div>
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl neu-btn flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3.5 neu-inset-sm text-red-500 text-xs rounded-2xl font-bold">
                  {formError}
                </div>
              )}

              {/* Coupon Code */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-mono uppercase font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20% off on all luxury scents"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
                />
              </div>

              {/* Discount Type */}
              <div className="grid grid-cols-3 gap-2.5">
                {(['percentage', 'fixed', 'free_shipping'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setFormType(t)}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      formType === t
                        ? 'neu-inset-sm text-primary'
                        : 'neu-btn text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'percentage' && 'Percentage'}
                    {t === 'fixed' && 'Fixed (₹)'}
                    {t === 'free_shipping' && 'Free Shipping'}
                  </button>
                ))}
              </div>

              {/* Discount Value & Max Discount */}
              {formType !== 'free_shipping' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      {formType === 'percentage' ? 'Percentage (%) *' : 'Amount (₹) *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                    />
                  </div>

                  {formType === 'percentage' && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Max Cap (₹ Optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 500"
                        value={formMaxDiscount}
                        onChange={(e) => setFormMaxDiscount(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Min Order & Usage Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Usage Limit (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={formUsageLimit}
                    onChange={(e) => setFormUsageLimit(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-border/30">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFirstOrder}
                    onChange={(e) => setFormFirstOrder(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                  />
                  <span className="text-xs font-bold text-foreground">Restrict to first-time customer orders</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                  />
                  <span className="text-xs font-bold text-foreground">Activate immediately</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold rounded-2xl neu-btn text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl neu-btn-primary disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
