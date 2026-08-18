'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone, 
  Calendar, 
  IndianRupee, 
  ShoppingBag, 
  Tag, 
  FileText, 
  MapPin, 
  Save, 
  Loader2,
  PackageCheck,
  Plus
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface OrderItemSummary {
  id: string;
  order_number: string;
  status: string;
  total: string;
  created_at: string;
  items_count: number;
}

interface CustomerDetail {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  date_joined: string;
  tags: string[];
  notes: string;
  metrics: {
    lifetime_value: string;
    orders_count: number;
    average_order_value: string;
  };
  recent_address: any;
  orders: OrderItemSummary[];
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/auth/merchant/customers/${id}/`);
      if (data) {
        setCustomer(data);
        setNotes(data.notes || '');
        setTagsInput((data.tags || []).join(', '));
      }
    } catch (err) {
      console.error('Error fetching customer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleSaveNotesAndTags = async () => {
    setSaving(true);
    try {
      const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

      await apiFetch(`/auth/merchant/customers/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          notes,
          tags: tagsArray
        })
      });
      fetchCustomerDetails();
    } catch (err) {
      console.error('Error saving customer notes and tags:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await apiFetch(`/auth/merchant/customers/${id}/toggle-status/`, {
        method: 'POST'
      });
      fetchCustomerDetails();
    } catch (err) {
      console.error('Error toggling customer status:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading customer profile...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-12 text-center space-y-4 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-foreground">Customer Profile Not Found</h2>
        <Link href="/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="w-4 h-4" /> Return to Directory
        </Link>
      </div>
    );
  }

  const addr = customer.recent_address || {};

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/customers"
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{customer.full_name}</h1>
              {customer.is_active ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active Account
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive"></span>
                  Account Disabled
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Member since {new Date(customer.date_joined).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleStatus}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
            customer.is_active
              ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
              : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
          }`}
        >
          {customer.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          {customer.is_active ? 'Disable Account' : 'Enable Account'}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lifetime Value (LTV)</span>
            <IndianRupee className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-foreground">₹{customer.metrics.lifetime_value}</h3>
          <p className="text-[11px] text-muted-foreground mt-1">Total revenue from completed orders</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-2xl font-extrabold text-foreground">{customer.metrics.orders_count}</h3>
          <p className="text-[11px] text-muted-foreground mt-1">Orders placed across storefront</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Order Value (AOV)</span>
            <PackageCheck className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-foreground">₹{customer.metrics.average_order_value}</h3>
          <p className="text-[11px] text-muted-foreground mt-1">Average spend per purchase</p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Order History) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                Purchase & Order History ({customer.orders.length})
              </h2>
            </div>

            {customer.orders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium">No orders placed yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-5">Order #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Items</th>
                      <th className="py-3 px-5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customer.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-primary">
                          <Link href={`/orders`}>
                            #{o.order_number}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            o.status === 'Paid' || o.status === 'Delivered'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium">
                          {o.items_count}
                        </td>
                        <td className="py-3.5 px-5 text-right font-extrabold text-foreground">
                          ₹{o.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Customer Profile & Metadata Cards) */}
        <div className="space-y-6">
          
          {/* Contact Details Card */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-3">
              Contact Overview
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(customer.date_joined).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Shipping Address Card */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Recent Shipping Address
            </h3>

            {addr.first_name || addr.address1 ? (
              <div className="text-xs space-y-1 text-muted-foreground leading-relaxed">
                <p className="font-bold text-foreground text-sm">{addr.first_name} {addr.last_name}</p>
                <p>{addr.address1}</p>
                {addr.address2 && <p>{addr.address2}</p>}
                <p>{addr.city}, {addr.state} — {addr.pincode || addr.zip}</p>
                <p className="font-medium text-foreground">{addr.country || 'India'}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No shipping address recorded yet.</p>
            )}
          </div>

          {/* Tags & Staff Notes Panel */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Tags & Notes
              </span>
              <button
                onClick={handleSaveNotesAndTags}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-all shadow-xs"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer Tags</label>
                <div className="relative">
                  <Tag className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="VIP, Collector, High Value"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Internal Staff Notes</label>
                <textarea
                  rows={4}
                  placeholder="Add private staff notes regarding preferences or customer service requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
