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
  Clock,
  Zap,
  Flame,
  Layers,
  Sparkles,
  Download,
  Users,
  Tag,
  ShieldCheck,
  Filter
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
  per_customer_limit: number | null;
  product_restrictions?: string[];
  category_restrictions?: string[];
  customer_restrictions?: string[];
  is_active: boolean;
  first_order_only: boolean;
  created_at: string;
}

interface Promotion {
  id: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  target_type: 'all' | 'category' | 'brand' | 'product' | 'customer_group';
  target_values: string[];
  min_order_value: string;
  max_discount: string | null;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  is_active: boolean;
  is_flash_sale: boolean;
  combination_rule: 'exclusive' | 'stackable';
  created_at: string;
}

interface CouponMetrics {
  total_coupons: number;
  active_coupons: number;
  total_redemptions: number;
}

interface PromotionMetrics {
  total_promotions: number;
  active_promotions: number;
  flash_sales: number;
}

export default function CouponsAndPromotionsPage() {
  const [activeTab, setActiveTab] = useState<'coupons' | 'promotions'>('coupons');

  // Coupon State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponMetrics, setCouponMetrics] = useState<CouponMetrics>({
    total_coupons: 0,
    active_coupons: 0,
    total_redemptions: 0,
  });
  const [couponLoading, setCouponLoading] = useState(true);
  const [couponSearch, setCouponSearch] = useState('');
  const [couponStatus, setCouponStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Promotion State
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoMetrics, setPromoMetrics] = useState<PromotionMetrics>({
    total_promotions: 0,
    active_promotions: 0,
    flash_sales: 0,
  });
  const [promoLoading, setPromoLoading] = useState(true);
  const [promoSearch, setPromoSearch] = useState('');
  const [promoStatus, setPromoStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [promoTargetFilter, setPromoTargetFilter] = useState<string>('all');

  // Coupon Modal State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage');
  const [formValue, setFormValue] = useState('10');
  const [formMinOrder, setFormMinOrder] = useState('0');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formUsageLimit, setFormUsageLimit] = useState('');
  const [formPerCustomerLimit, setFormPerCustomerLimit] = useState('1');
  const [formProductRestrictions, setFormProductRestrictions] = useState('');
  const [formCategoryRestrictions, setFormCategoryRestrictions] = useState('');
  const [formCustomerRestrictions, setFormCustomerRestrictions] = useState('');
  const [formFirstOrder, setFormFirstOrder] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const [couponFormError, setCouponFormError] = useState('');

  // Bulk Generator Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState('PROMO');
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkType, setBulkType] = useState<'percentage' | 'fixed'>('percentage');
  const [bulkValue, setBulkValue] = useState('15');
  const [bulkMinOrder, setBulkMinOrder] = useState('499');
  const [bulkMaxDiscount, setBulkMaxDiscount] = useState('200');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkGeneratedCodes, setBulkGeneratedCodes] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // Promotion Modal State
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoName, setPromoName] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoType, setPromoType] = useState<'percentage' | 'fixed'>('percentage');
  const [promoValue, setPromoValue] = useState('20');
  const [promoTargetType, setPromoTargetType] = useState<'all' | 'category' | 'brand' | 'product' | 'customer_group'>('all');
  const [promoTargetValues, setPromoTargetValues] = useState('');
  const [promoMinOrder, setPromoMinOrder] = useState('0');
  const [promoMaxDiscount, setPromoMaxDiscount] = useState('');
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoPriority, setPromoPriority] = useState('10');
  const [promoCombination, setPromoCombination] = useState<'stackable' | 'exclusive'>('stackable');
  const [promoIsFlashSale, setPromoIsFlashSale] = useState(false);
  const [promoIsActive, setPromoIsActive] = useState(true);
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoFormError, setPromoFormError] = useState('');

  // Fetch Coupons
  const fetchCoupons = async () => {
    setCouponLoading(true);
    try {
      const params = new URLSearchParams();
      if (couponSearch.trim()) params.append('q', couponSearch.trim());
      if (couponStatus !== 'all') params.append('status', couponStatus);

      const res = await apiFetch(`/orders/merchant/coupons/?${params.toString()}`);
      if (res) {
        setCoupons(res.coupons || []);
        if (res.metrics) setCouponMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setCouponLoading(false);
    }
  };

  // Fetch Promotions
  const fetchPromotions = async () => {
    setPromoLoading(true);
    try {
      const params = new URLSearchParams();
      if (promoSearch.trim()) params.append('q', promoSearch.trim());
      if (promoStatus !== 'all') params.append('status', promoStatus);
      if (promoTargetFilter !== 'all') params.append('target', promoTargetFilter);

      const res = await apiFetch(`/orders/merchant/promotions/?${params.toString()}`);
      if (res) {
        setPromotions(res.promotions || []);
        if (res.metrics) setPromoMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load promotions:', err);
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [couponSearch, couponStatus]);

  useEffect(() => {
    fetchPromotions();
  }, [promoSearch, promoStatus, promoTargetFilter]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Coupon Actions
  const handleToggleCouponStatus = async (id: string) => {
    try {
      await apiFetch(`/orders/merchant/coupons/${id}/toggle/`, { method: 'POST' });
      fetchCoupons();
    } catch (err) {
      console.error('Toggle coupon status failed:', err);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return;
    try {
      await apiFetch(`/orders/merchant/coupons/${id}/`, { method: 'DELETE' });
      fetchCoupons();
    } catch (err) {
      console.error('Delete coupon failed:', err);
    }
  };

  // Promotion Actions
  const handleTogglePromoStatus = async (id: string) => {
    try {
      await apiFetch(`/orders/merchant/promotions/${id}/toggle/`, { method: 'POST' });
      fetchPromotions();
    } catch (err) {
      console.error('Toggle promotion status failed:', err);
    }
  };

  const handleDeletePromo = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete promotion "${name}"?`)) return;
    try {
      await apiFetch(`/orders/merchant/promotions/${id}/`, { method: 'DELETE' });
      fetchPromotions();
    } catch (err) {
      console.error('Delete promotion failed:', err);
    }
  };

  // Open Coupon Modal
  const openCreateCouponModal = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormDescription('');
    setFormType('percentage');
    setFormValue('10');
    setFormMinOrder('0');
    setFormMaxDiscount('');
    setFormEndDate('');
    setFormUsageLimit('');
    setFormPerCustomerLimit('1');
    setFormProductRestrictions('');
    setFormCategoryRestrictions('');
    setFormCustomerRestrictions('');
    setFormFirstOrder(false);
    setFormIsActive(true);
    setCouponFormError('');
    setIsCouponModalOpen(true);
  };

  const openEditCouponModal = (c: Coupon) => {
    setEditingCoupon(c);
    setFormCode(c.code);
    setFormDescription(c.description || '');
    setFormType(c.discount_type);
    setFormValue(c.discount_value);
    setFormMinOrder(c.min_order_value || '0');
    setFormMaxDiscount(c.max_discount || '');
    setFormEndDate(c.end_date ? c.end_date.split('T')[0] : '');
    setFormUsageLimit(c.usage_limit ? String(c.usage_limit) : '');
    setFormPerCustomerLimit(c.per_customer_limit ? String(c.per_customer_limit) : '');
    setFormProductRestrictions((c.product_restrictions || []).join(', '));
    setFormCategoryRestrictions((c.category_restrictions || []).join(', '));
    setFormCustomerRestrictions((c.customer_restrictions || []).join(', '));
    setFormFirstOrder(c.first_order_only);
    setFormIsActive(c.is_active);
    setCouponFormError('');
    setIsCouponModalOpen(true);
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponSubmitting(true);
    setCouponFormError('');

    const payload = {
      code: formCode.trim().toUpperCase(),
      description: formDescription.trim(),
      discount_type: formType,
      discount_value: formType === 'free_shipping' ? 0 : parseFloat(formValue) || 0,
      min_order_value: parseFloat(formMinOrder) || 0,
      max_discount: formMaxDiscount ? parseFloat(formMaxDiscount) : null,
      end_date: formEndDate ? `${formEndDate}T23:59:59Z` : null,
      usage_limit: formUsageLimit ? parseInt(formUsageLimit, 10) : null,
      per_customer_limit: formPerCustomerLimit ? parseInt(formPerCustomerLimit, 10) : null,
      product_restrictions: formProductRestrictions.split(',').map(s => s.trim()).filter(Boolean),
      category_restrictions: formCategoryRestrictions.split(',').map(s => s.trim()).filter(Boolean),
      customer_restrictions: formCustomerRestrictions.split(',').map(s => s.trim()).filter(Boolean),
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
      setIsCouponModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      setCouponFormError(err.message || 'Failed to save coupon.');
    } finally {
      setCouponSubmitting(false);
    }
  };

  // Handle Bulk Generation
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSubmitting(true);
    setBulkError('');
    setBulkGeneratedCodes([]);

    const payload = {
      prefix: bulkPrefix.trim().toUpperCase(),
      count: parseInt(bulkCount, 10) || 10,
      discount_type: bulkType,
      discount_value: parseFloat(bulkValue) || 0,
      min_order_value: parseFloat(bulkMinOrder) || 0,
      max_discount: bulkMaxDiscount ? parseFloat(bulkMaxDiscount) : null,
      end_date: bulkEndDate ? `${bulkEndDate}T23:59:59Z` : null,
      usage_limit: 1,
      per_customer_limit: 1,
    };

    try {
      const res = await apiFetch('/orders/merchant/coupons/bulk-generate/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res && res.codes) {
        setBulkGeneratedCodes(res.codes);
        fetchCoupons();
      }
    } catch (err: any) {
      setBulkError(err.message || 'Failed to generate bulk coupons.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Open Promotion Modal
  const openCreatePromoModal = () => {
    setEditingPromo(null);
    setPromoName('');
    setPromoDesc('');
    setPromoType('percentage');
    setPromoValue('20');
    setPromoTargetType('all');
    setPromoTargetValues('');
    setPromoMinOrder('0');
    setPromoMaxDiscount('');
    setPromoStartDate('');
    setPromoEndDate('');
    setPromoPriority('10');
    setPromoCombination('stackable');
    setPromoIsFlashSale(false);
    setPromoIsActive(true);
    setPromoFormError('');
    setIsPromoModalOpen(true);
  };

  const openEditPromoModal = (p: Promotion) => {
    setEditingPromo(p);
    setPromoName(p.name);
    setPromoDesc(p.description || '');
    setPromoType(p.discount_type);
    setPromoValue(p.discount_value);
    setPromoTargetType(p.target_type);
    setPromoTargetValues((p.target_values || []).join(', '));
    setPromoMinOrder(p.min_order_value || '0');
    setPromoMaxDiscount(p.max_discount || '');
    setPromoStartDate(p.start_date ? p.start_date.split('T')[0] : '');
    setPromoEndDate(p.end_date ? p.end_date.split('T')[0] : '');
    setPromoPriority(String(p.priority || 0));
    setPromoCombination(p.combination_rule || 'stackable');
    setPromoIsFlashSale(p.is_flash_sale);
    setPromoIsActive(p.is_active);
    setPromoFormError('');
    setIsPromoModalOpen(true);
  };

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoSubmitting(true);
    setPromoFormError('');

    const payload = {
      name: promoName.trim(),
      description: promoDesc.trim(),
      discount_type: promoType,
      discount_value: parseFloat(promoValue) || 0,
      target_type: promoTargetType,
      target_values: promoTargetValues.split(',').map(s => s.trim()).filter(Boolean),
      min_order_value: parseFloat(promoMinOrder) || 0,
      max_discount: promoMaxDiscount ? parseFloat(promoMaxDiscount) : null,
      start_date: promoStartDate ? `${promoStartDate}T00:00:00Z` : null,
      end_date: promoEndDate ? `${promoEndDate}T23:59:59Z` : null,
      priority: parseInt(promoPriority, 10) || 0,
      combination_rule: promoCombination,
      is_flash_sale: promoIsFlashSale,
      is_active: promoIsActive,
    };

    try {
      if (editingPromo) {
        await apiFetch(`/orders/merchant/promotions/${editingPromo.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/orders/merchant/promotions/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsPromoModalOpen(false);
      fetchPromotions();
    } catch (err: any) {
      setPromoFormError(err.message || 'Failed to save promotion.');
    } finally {
      setPromoSubmitting(false);
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
                {activeTab === 'coupons' ? <Ticket className="w-5 h-5" /> : <Sparkles className="w-5 h-5 text-amber-500" />}
              </div>
              Discounts, Promotions & Coupons
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-primary uppercase tracking-wider">
              {activeTab === 'coupons' ? 'Vouchers' : 'Automated Deals'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure coupons, automated storewide/category/brand promotions, priority conflict resolution, and flash sales.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {activeTab === 'coupons' ? (
            <>
              <button
                onClick={() => {
                  setBulkGeneratedCodes([]);
                  setBulkError('');
                  setIsBulkModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 neu-btn font-bold rounded-2xl transition-all text-xs cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Layers className="w-4 h-4 text-primary" />
                <span>Bulk Generate</span>
              </button>
              <button
                onClick={openCreateCouponModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-bold rounded-2xl transition-all text-sm cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Coupon</span>
              </button>
            </>
          ) : (
            <button
              onClick={openCreatePromoModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-bold rounded-2xl transition-all text-sm cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create Promotion</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex items-center gap-3 border-b border-border/20 pb-2">
        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
            activeTab === 'coupons'
              ? 'neu-inset-sm text-primary'
              : 'neu-btn text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Coupon Vouchers</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary ml-1">
            {couponMetrics.total_coupons}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
            activeTab === 'promotions'
              ? 'neu-inset-sm text-primary'
              : 'neu-btn text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Automated Promotions & Flash Sales</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 ml-1">
            {promoMetrics.total_promotions}
          </span>
        </button>
      </div>

      {activeTab === 'coupons' ? (
        <>
          {/* Coupon KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-primary">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Coupons</p>
                <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{couponMetrics.total_coupons}</h3>
              </div>
            </div>

            <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-emerald-500">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Campaigns</p>
                <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{couponMetrics.active_coupons}</h3>
              </div>
            </div>

            <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-amber-500">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Audited Redemptions</p>
                <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{couponMetrics.total_redemptions}</h3>
              </div>
            </div>
          </div>

          {/* Coupon Search & Filters */}
          <div className="bg-card neu-extruded border border-border/10 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search coupon code..."
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
              {(['all', 'active', 'inactive'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCouponStatus(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer ${
                    couponStatus === tab
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
            {couponLoading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-sm font-semibold">Loading coupon codes...</p>
              </div>
            ) : coupons.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <Ticket className="w-12 h-12 mx-auto stroke-[1.2] opacity-40 text-primary" />
                <p className="font-bold text-base text-foreground">No coupons found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto font-medium">
                  Create your first promotional discount voucher or bulk generate unique gift codes.
                </p>
                <button
                  onClick={openCreateCouponModal}
                  className="inline-flex items-center gap-2 px-4 py-2 neu-btn-primary font-bold rounded-xl text-xs cursor-pointer mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Coupon</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 border-b border-border/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-4 px-5">Code</th>
                      <th className="py-4 px-4">Discount</th>
                      <th className="py-4 px-4">Min Order & Cap</th>
                      <th className="py-4 px-4">Per Customer</th>
                      <th className="py-4 px-4">Restrictions</th>
                      <th className="py-4 px-4">Redemptions</th>
                      <th className="py-4 px-4">Validity</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-medium">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                        {/* Code */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-foreground tracking-wide px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs">
                              {c.code}
                            </span>
                            <button
                              onClick={() => handleCopy(c.code)}
                              title="Copy code"
                              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              {copiedCode === c.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {c.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs mt-1">
                              {c.description}
                            </p>
                          )}
                        </td>

                        {/* Discount */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            {c.discount_type === 'percentage' && (
                              <>
                                <Percent className="w-3.5 h-3.5 text-primary" />
                                <span>{parseFloat(c.discount_value)}% OFF</span>
                              </>
                            )}
                            {c.discount_type === 'fixed' && (
                              <>
                                <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                                <span>₹{parseFloat(c.discount_value)} OFF</span>
                              </>
                            )}
                            {c.discount_type === 'free_shipping' && (
                              <>
                                <Truck className="w-3.5 h-3.5 text-blue-500" />
                                <span>Free Shipping</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Min Order & Max Cap */}
                        <td className="py-4 px-4 text-xs space-y-0.5">
                          <div>
                            <span className="text-muted-foreground">Min: </span>
                            <span className="font-semibold text-foreground">₹{parseFloat(c.min_order_value || '0')}</span>
                          </div>
                          {c.max_discount && (
                            <div>
                              <span className="text-muted-foreground">Cap: </span>
                              <span className="font-semibold text-foreground">₹{parseFloat(c.max_discount)}</span>
                            </div>
                          )}
                        </td>

                        {/* Per Customer Limit */}
                        <td className="py-4 px-4 text-xs font-semibold text-foreground">
                          {c.per_customer_limit ? (
                            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {c.per_customer_limit} / user
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">Unlimited</span>
                          )}
                        </td>

                        {/* Restrictions */}
                        <td className="py-4 px-4 text-xs">
                          {c.first_order_only && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 mb-1">
                              1st Order Only
                            </span>
                          )}
                          {(c.product_restrictions && c.product_restrictions.length > 0) && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-500 mb-1">
                              {c.product_restrictions.length} Products
                            </span>
                          )}
                          {(c.category_restrictions && c.category_restrictions.length > 0) && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-500 mb-1">
                              {c.category_restrictions.length} Categories
                            </span>
                          )}
                          {!c.first_order_only && (!c.product_restrictions || c.product_restrictions.length === 0) && (!c.category_restrictions || c.category_restrictions.length === 0) && (
                            <span className="text-muted-foreground/60">No restrictions</span>
                          )}
                        </td>

                        {/* Redemptions */}
                        <td className="py-4 px-4 text-xs">
                          <span className="font-extrabold text-foreground">{c.times_used}</span>
                          <span className="text-muted-foreground">
                            {c.usage_limit ? ` / ${c.usage_limit}` : ' uses'}
                          </span>
                        </td>

                        {/* Expiry */}
                        <td className="py-4 px-4 text-xs">
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
                            onClick={() => handleToggleCouponStatus(c.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm transition-all cursor-pointer ${
                              c.is_active ? 'text-emerald-500' : 'text-zinc-500'
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
                              onClick={() => openEditCouponModal(c)}
                              title="Edit Coupon"
                              className="p-2 neu-btn text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(c.id, c.code)}
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
        </>
      ) : (
        <>
          {/* Promotion KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-primary">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Campaigns</p>
                <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{promoMetrics.total_promotions}</h3>
              </div>
            </div>

            <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-emerald-500">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Deals</p>
                <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{promoMetrics.active_promotions}</h3>
              </div>
            </div>

            <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-red-500">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Flash Sales Active</p>
                <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{promoMetrics.flash_sales}</h3>
              </div>
            </div>
          </div>

          {/* Promotion Search & Filters */}
          <div className="bg-card neu-extruded border border-border/10 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search promotions..."
                value={promoSearch}
                onChange={(e) => setPromoSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
              <select
                value={promoTargetFilter}
                onChange={(e) => setPromoTargetFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold neu-input rounded-xl text-muted-foreground cursor-pointer"
              >
                <option value="all">All Targets</option>
                <option value="all">Storewide</option>
                <option value="category">Category</option>
                <option value="brand">Brand</option>
                <option value="product">Product</option>
                <option value="customer_group">Customer Group</option>
              </select>

              {(['all', 'active', 'inactive'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPromoStatus(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer ${
                    promoStatus === tab
                      ? 'neu-inset-sm text-primary'
                      : 'neu-btn text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'all' ? 'All Statuses' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Promotions Table */}
          <div className="bg-card neu-extruded border border-border/10 rounded-3xl overflow-hidden">
            {promoLoading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-sm font-semibold">Loading promotions...</p>
              </div>
            ) : promotions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <Sparkles className="w-12 h-12 mx-auto stroke-[1.2] opacity-40 text-amber-500" />
                <p className="font-bold text-base text-foreground">No promotions found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto font-medium">
                  Launch automated storewide sales, brand deals, or flash sale campaigns.
                </p>
                <button
                  onClick={openCreatePromoModal}
                  className="inline-flex items-center gap-2 px-4 py-2 neu-btn-primary font-bold rounded-xl text-xs cursor-pointer mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Promotion</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 border-b border-border/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-4 px-5">Campaign Name</th>
                      <th className="py-4 px-4">Target Type</th>
                      <th className="py-4 px-4">Discount</th>
                      <th className="py-4 px-4">Priority & Stacking</th>
                      <th className="py-4 px-4">Min Order & Cap</th>
                      <th className="py-4 px-4">Flash Sale</th>
                      <th className="py-4 px-4">Schedule</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-medium">
                    {promotions.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                        {/* Campaign Name */}
                        <td className="py-4 px-5">
                          <p className="font-extrabold text-foreground tracking-wide text-sm">
                            {p.name}
                          </p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                              {p.description}
                            </p>
                          )}
                        </td>

                        {/* Target */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-primary/10 text-primary w-fit uppercase">
                              {p.target_type}
                            </span>
                            {p.target_values && p.target_values.length > 0 && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                                {p.target_values.join(', ')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Discount */}
                        <td className="py-4 px-4 font-bold text-foreground">
                          {p.discount_type === 'percentage' ? (
                            <span className="flex items-center gap-1 text-primary">
                              <Percent className="w-3.5 h-3.5" />
                              {parseFloat(p.discount_value)}% OFF
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-500">
                              <IndianRupee className="w-3.5 h-3.5" />
                              ₹{parseFloat(p.discount_value)} OFF
                            </span>
                          )}
                        </td>

                        {/* Priority & Stacking */}
                        <td className="py-4 px-4 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-muted-foreground">Priority:</span>
                            <span className="px-1.5 py-0.5 rounded bg-muted text-foreground">
                              {p.priority}
                            </span>
                          </div>
                          <div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.combination_rule === 'exclusive'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {p.combination_rule === 'exclusive' ? 'Exclusive' : 'Stackable'}
                            </span>
                          </div>
                        </td>

                        {/* Min Order & Max Cap */}
                        <td className="py-4 px-4 text-xs space-y-0.5">
                          <div>
                            <span className="text-muted-foreground">Min: </span>
                            <span className="font-semibold text-foreground">₹{parseFloat(p.min_order_value || '0')}</span>
                          </div>
                          {p.max_discount && (
                            <div>
                              <span className="text-muted-foreground">Cap: </span>
                              <span className="font-semibold text-foreground">₹{parseFloat(p.max_discount)}</span>
                            </div>
                          )}
                        </td>

                        {/* Flash Sale */}
                        <td className="py-4 px-4">
                          {p.is_flash_sale ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-500/15 text-red-500 animate-pulse">
                              <Flame className="w-3.5 h-3.5 fill-red-500" />
                              Flash Sale
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 text-xs">Standard</span>
                          )}
                        </td>

                        {/* Schedule */}
                        <td className="py-4 px-4 text-xs">
                          {p.start_date || p.end_date ? (
                            <div className="space-y-0.5">
                              {p.start_date && (
                                <p className="text-muted-foreground">
                                  From: <span className="font-medium text-foreground">{new Date(p.start_date).toLocaleDateString()}</span>
                                </p>
                              )}
                              {p.end_date && (
                                <p className="text-muted-foreground">
                                  Until: <span className="font-medium text-foreground">{new Date(p.end_date).toLocaleDateString()}</span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">Always on</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleTogglePromoStatus(p.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm transition-all cursor-pointer ${
                              p.is_active ? 'text-emerald-500' : 'text-zinc-500'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                            {p.is_active ? 'Active' : 'Disabled'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditPromoModal(p)}
                              title="Edit Promotion"
                              className="p-2 neu-btn text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePromo(p.id, p.name)}
                              title="Delete Promotion"
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
        </>
      )}

      {/* Create / Edit Coupon Modal */}
      {isCouponModalOpen && (
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
                onClick={() => setIsCouponModalOpen(false)}
                className="w-8 h-8 rounded-xl neu-btn flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCouponSubmit} className="p-6 space-y-4 overflow-y-auto">
              {couponFormError && (
                <div className="p-3.5 neu-inset-sm text-red-500 text-xs rounded-2xl font-bold">
                  {couponFormError}
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

              {/* Min Order & Limits */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Min Order (₹)
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
                    Global Limit
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

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Per Customer
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formPerCustomerLimit}
                    onChange={(e) => setFormPerCustomerLimit(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>
              </div>

              {/* Restrictions */}
              <div className="space-y-3 pt-2 border-t border-border/30">
                <p className="text-xs font-extrabold uppercase text-foreground">Whitelist Restrictions (Optional)</p>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Allowed Product IDs / Slugs (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. royal-oud-luxury, amber-oud"
                    value={formProductRestrictions}
                    onChange={(e) => setFormProductRestrictions(e.target.value)}
                    className="w-full px-4 py-2 text-xs neu-input rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Allowed Categories (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Perfumes, Attars"
                    value={formCategoryRestrictions}
                    onChange={(e) => setFormCategoryRestrictions(e.target.value)}
                    className="w-full px-4 py-2 text-xs neu-input rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Allowed Customer Emails (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. vip@example.com, influencer@pb.com"
                    value={formCustomerRestrictions}
                    onChange={(e) => setFormCustomerRestrictions(e.target.value)}
                    className="w-full px-4 py-2 text-xs neu-input rounded-xl"
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
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold rounded-2xl neu-btn text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={couponSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl neu-btn-primary disabled:opacity-50 cursor-pointer"
                >
                  {couponSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Generator Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card neu-extruded border border-border/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4.5 border-b border-border/30 flex items-center justify-between bg-muted/20">
              <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl neu-inset-sm flex items-center justify-center text-primary">
                  <Layers className="w-4 h-4" />
                </div>
                Bulk Coupon Generator
              </h2>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="w-8 h-8 rounded-xl neu-btn flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="p-6 space-y-4 overflow-y-auto">
              {bulkError && (
                <div className="p-3.5 neu-inset-sm text-red-500 text-xs rounded-2xl font-bold">
                  {bulkError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Prefix *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP, SALE"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Number of Codes (Max 500) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="500"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Discount Type
                  </label>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as any)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bulkMinOrder}
                    onChange={(e) => setBulkMinOrder(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Max Cap (₹ Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bulkMaxDiscount}
                    onChange={(e) => setBulkMaxDiscount(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={bulkEndDate}
                  onChange={(e) => setBulkEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
                />
              </div>

              {bulkGeneratedCodes.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-500">
                      Generated {bulkGeneratedCodes.length} Codes Successfully!
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bulkGeneratedCodes.join('\n'))}
                      className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy All
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto p-2 bg-card rounded-xl text-xs font-mono font-bold text-foreground grid grid-cols-2 gap-1.5 border border-border/30">
                    {bulkGeneratedCodes.map((c) => (
                      <span key={c} className="truncate">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold rounded-2xl neu-btn text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl neu-btn-primary disabled:opacity-50 cursor-pointer"
                >
                  {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Promotion Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card neu-extruded border border-border/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4.5 border-b border-border/30 flex items-center justify-between bg-muted/20">
              <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl neu-inset-sm flex items-center justify-center text-amber-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                {editingPromo ? 'Edit Promotion' : 'Create Automated Promotion'}
              </h2>
              <button
                onClick={() => setIsPromoModalOpen(false)}
                className="w-8 h-8 rounded-xl neu-btn flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePromoSubmit} className="p-6 space-y-4 overflow-y-auto">
              {promoFormError && (
                <div className="p-3.5 neu-inset-sm text-red-500 text-xs rounded-2xl font-bold">
                  {promoFormError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwalii Mega Fragrance Sale"
                  value={promoName}
                  onChange={(e) => setPromoName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25% off all luxury perfumes"
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
                />
              </div>

              {/* Target Type */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Target Audience / Scope *
                </label>
                <select
                  value={promoTargetType}
                  onChange={(e) => setPromoTargetType(e.target.value as any)}
                  className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                >
                  <option value="all">Storewide (All Products)</option>
                  <option value="category">Category Specific</option>
                  <option value="brand">Brand Specific</option>
                  <option value="product">Specific Product IDs/Slugs</option>
                  <option value="customer_group">Customer Group / Tag (e.g. VIP)</option>
                </select>
              </div>

              {/* Target Values */}
              {promoTargetType !== 'all' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Target Values (comma separated) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      promoTargetType === 'category'
                        ? 'e.g. Perfumes, Deodorants'
                        : promoTargetType === 'brand'
                        ? 'e.g. Al Haramain, Armaf, Rasasi'
                        : promoTargetType === 'product'
                        ? 'e.g. royal-oud, amber-oud'
                        : 'e.g. vip, loyalty-member'
                    }
                    value={promoTargetValues}
                    onChange={(e) => setPromoTargetValues(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
                  />
                </div>
              )}

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Discount Type
                  </label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value as any)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={promoValue}
                    onChange={(e) => setPromoValue(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={promoMinOrder}
                    onChange={(e) => setPromoMinOrder(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional cap"
                    value={promoMaxDiscount}
                    onChange={(e) => setPromoMaxDiscount(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>
              </div>

              {/* Start & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={promoStartDate}
                    onChange={(e) => setPromoStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={promoEndDate}
                    onChange={(e) => setPromoEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
                  />
                </div>
              </div>

              {/* Priority & Combination Rules */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Priority (Higher Wins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={promoPriority}
                    onChange={(e) => setPromoPriority(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Combination Rule
                  </label>
                  <select
                    value={promoCombination}
                    onChange={(e) => setPromoCombination(e.target.value as any)}
                    className="w-full px-4 py-2.5 text-sm neu-input rounded-2xl font-bold"
                  >
                    <option value="stackable">Stackable (Combines with coupons)</option>
                    <option value="exclusive">Exclusive (Disallows coupons)</option>
                  </select>
                </div>
              </div>

              {/* Toggles: Flash Sale & Active */}
              <div className="space-y-2.5 pt-2 border-t border-border/30">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoIsFlashSale}
                    onChange={(e) => setPromoIsFlashSale(e.target.checked)}
                    className="w-4 h-4 rounded text-red-500 focus:ring-red-500 border-border"
                  />
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                    Mark as Urgent Flash Sale (triggers storefront banner & countdown)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoIsActive}
                    onChange={(e) => setPromoIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                  />
                  <span className="text-xs font-bold text-foreground">Activate immediately</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold rounded-2xl neu-btn text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={promoSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl neu-btn-primary disabled:opacity-50 cursor-pointer"
                >
                  {promoSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingPromo ? 'Update Promotion' : 'Launch Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
