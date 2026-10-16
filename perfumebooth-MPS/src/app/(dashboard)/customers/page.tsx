'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserCheck, 
  IndianRupee, 
  ShoppingBag, 
  Search, 
  Plus, 
  UserX, 
  MoreVertical, 
  ChevronRight,
  Loader2,
  Tag,
  Calendar
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import NewCustomerModal from '@/components/customers/NewCustomerModal';

interface Customer {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  date_joined: string;
  orders_count: number;
  lifetime_value: string;
  last_order_date: string | null;
  tags: string[];
}

interface Metrics {
  total_customers: number;
  active_customers: number;
  total_ltv: string;
  average_order_value: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total_customers: 0,
    active_customers: 0,
    total_ltv: '0.00',
    average_order_value: '0.00',
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const data = await apiFetch(`/auth/merchant/customers/?${params.toString()}`);
      if (data) {
        setCustomers(data.customers || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching customer directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, statusFilter]);

  const toggleCustomerStatus = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/auth/merchant/customers/${id}/toggle-status/`, {
        method: 'POST'
      });
      fetchCustomers();
    } catch (err) {
      console.error('Error toggling customer status:', err);
    } finally {
      setActionMenuId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Customer Directory</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-primary">
              Accounts
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Manage customer accounts, purchase history, lifetime value (LTV), and account statuses.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 neu-btn-primary font-bold rounded-2xl transition-all text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* KPI Metric Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{metrics.total_customers}</h3>
          </div>
        </div>

        <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-emerald-500">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Customers</p>
            <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{metrics.active_customers}</h3>
          </div>
        </div>

        <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-amber-500">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Revenue (LTV)</p>
            <h3 className="text-2xl font-extrabold text-foreground mt-0.5">₹{metrics.total_ltv}</h3>
          </div>
        </div>

        <div className="bg-card neu-extruded border border-border/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center text-blue-500">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Order Value</p>
            <h3 className="text-2xl font-extrabold text-foreground mt-0.5">₹{metrics.average_order_value}</h3>
          </div>
        </div>
      </div>

      {/* Directory Filter Bar */}
      <div className="bg-card neu-extruded border border-border/10 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm neu-input rounded-2xl font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          {(['all', 'active', 'disabled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'neu-inset-sm text-primary'
                  : 'neu-btn text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'all' ? 'All Accounts' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-card neu-extruded border border-border/10 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-semibold">Loading customer directory...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="p-3 neu-inset-sm rounded-full w-12 h-12 mx-auto flex items-center justify-center text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Customers Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto font-medium">
              No matching customer accounts were found. Try adjusting your search query or add a new customer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-4">Contact Info</th>
                  <th className="py-4 px-4 text-center">Orders</th>
                  <th className="py-4 px-4 text-right">Lifetime Value</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Joined</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {customers.map((c) => (
                  <tr 
                    key={c.id} 
                    className="hover:bg-muted/10 transition-colors group cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full neu-inset-sm text-primary font-extrabold flex items-center justify-center uppercase text-sm shrink-0">
                          {c.first_name ? c.first_name[0] : (c.email ? c.email[0] : 'U')}
                        </div>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {c.full_name}
                          </p>
                          {c.tags && c.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {c.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold neu-inset-sm text-muted-foreground">
                                  <Tag className="w-2.5 h-2.5" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>

                    <td className="py-4 px-4 text-xs">
                      <p className="font-bold text-foreground">{c.email}</p>
                      <p className="text-muted-foreground mt-0.5 font-medium">{c.phone}</p>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-foreground">
                        {c.orders_count}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-extrabold text-foreground">
                      ₹{c.lifetime_value}
                    </td>

                    <td className="py-4 px-4">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-emerald-500">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-red-500">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          Disabled
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                      {new Date(c.date_joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    <td className="py-4 px-6 text-right relative">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/customers/${c.id}`}
                          className="p-2 neu-btn text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(actionMenuId === c.id ? null : c.id);
                          }}
                          className="p-2 neu-btn text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropdown Action Menu */}
                      {actionMenuId === c.id && (
                        <div 
                          className="absolute right-6 top-12 z-20 w-48 bg-card neu-extruded border border-border/10 rounded-2xl shadow-2xl py-1.5 text-left animate-in fade-in zoom-in-95 duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/customers/${c.id}`}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold hover:bg-muted/30 transition-colors text-foreground rounded-lg"
                          >
                            <Users className="w-3.5 h-3.5 text-primary" />
                            View Full Profile
                          </Link>
                          <button
                            onClick={(e) => toggleCustomerStatus(c.id, e)}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold hover:bg-muted/30 transition-colors text-red-500 rounded-lg cursor-pointer"
                          >
                            {c.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            {c.is_active ? 'Disable Account' : 'Enable Account'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Customer Modal */}
      <NewCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCustomers}
      />
    </div>
  );
}
