'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  TrendingUp, 
  IndianRupee, 
  ShoppingBag, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  AlertTriangle,
  Plus,
  FolderPlus,
  Crown,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface KPI {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  subtitle?: string;
}

interface TodaysMetrics {
  todaySales: string;
  todaySalesRaw: number;
  todaySalesChange: string;
  salesIsPositive: boolean;
  todayOrders: number;
  todayOrdersFormatted: string;
  todayOrdersChange: string;
  ordersIsPositive: boolean;
  todayAov: string;
  yesterdaySales: string;
  yesterdayOrders: number;
  currentDateIST: string;
}

interface SalesTrend {
  name: string;
  sales: number;
  date?: string;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface RecentOrder {
  id: string;
  orderNo: string;
  customer: string;
  total: string;
  status: string;
  date: string;
}

interface LowStockItem {
  id: string;
  title: string;
  sku: string;
  stock: number;
}

interface TopProduct {
  id: string;
  title: string;
  salesCount: number;
  revenue: string;
}

// Initial Clean Zero-State Arrays (No Mock / Dummy Data)
const initialKPIs: KPI[] = [
  { title: "Today's Orders", value: '0', change: '0.0%', isPositive: true, subtitle: 'vs yesterday' },
  { title: "Today's Sales", value: '₹0.00', change: '0.0%', isPositive: true, subtitle: 'vs yesterday' },
  { title: 'Total Revenue', value: '₹0.00', change: 'Confirmed', isPositive: true, subtitle: 'Lifetime store revenue' },
  { title: 'Total Orders', value: '0', change: 'Processed', isPositive: true, subtitle: 'All completed orders' },
  { title: 'Average Order Value', value: '₹0.00', change: 'Average', isPositive: true, subtitle: 'Storewide AOV' },
  { title: 'Active Customers', value: '0', change: 'Accounts', isPositive: true, subtitle: 'Unique purchasers' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaysMetrics, setTodaysMetrics] = useState<TodaysMetrics | null>(null);
  const [kpis, setKpis] = useState<KPI[]>(initialKPIs);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [liveVisitors, setLiveVisitors] = useState(0);
  const [timeRange, setTimeRange] = useState('7d');

  const fetchDashboardData = async (range: string = timeRange) => {
    try {
      setRefreshing(true);
      const data = await apiFetch<any>(`/shop/dashboard/?range=${range}`);
      if (!data) return;

      if (data.todaysMetrics) {
        setTodaysMetrics(data.todaysMetrics);
      }
      if (data.kpis && data.kpis.length > 0) {
        setKpis(data.kpis);
      }
      setSalesTrend(data.salesTrend || []);
      const colors = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#06b6d4', '#e11d48', '#d97706'];
      const mappedCategories = (data.categoryData || []).map((c: any, index: number) => ({
        ...c,
        color: c.color || colors[index % colors.length]
      }));
      setCategoryData(mappedCategories);
      setRecentOrders(data.recentOrders || []);
      setLowStock(data.lowStock || []);
      setTopProducts(data.topProducts || []);
      setLiveVisitors(data.liveVisitors || 0);
    } catch (err) {
      console.warn('Dashboard API error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (user) {
      fetchDashboardData(timeRange);
    }
  }, [user, timeRange]);

  if (!mounted) {
    return <div className="h-screen w-full bg-background animate-pulse"></div>;
  }

  if (loading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4 text-primary">
        <Loader2 className="w-10 h-10 animate-spin" />
        <span className="text-sm font-semibold text-muted-foreground">Calculating real-time analytics...</span>
      </div>
    );
  }

  // Icons matching logic
  const getIcon = (title: string) => {
    switch (title) {
      case "Today's Orders": return ShoppingBag;
      case "Today's Sales": return IndianRupee;
      case 'Total Revenue': return IndianRupee;
      case 'Total Orders': return ShoppingBag;
      case 'Active Customers': return Users;
      case 'Average Order Value': return IndianRupee;
      default: return IndianRupee;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time store metrics and operations summary</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => fetchDashboardData(timeRange)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 neu-btn rounded-2xl text-xs font-bold text-foreground hover:text-primary transition-all cursor-pointer disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {/* Date-Range Selector */}
          <div className="flex items-center gap-2 px-3.5 py-2 neu-inset-sm border border-border/20 rounded-2xl">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              value={timeRange}
              onChange={(e) => {
                const newRange = e.target.value;
                setTimeRange(newRange);
                fetchDashboardData(newRange);
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="today" className="bg-card text-foreground">Today (IST)</option>
              <option value="7d" className="bg-card text-foreground">Last 7 Days</option>
              <option value="30d" className="bg-card text-foreground">Last 30 Days</option>
              <option value="all" className="bg-card text-foreground">All Time</option>
            </select>
          </div>
        </div>
      </div>

      
      {/* Quick-Action Shortcuts Card */}
      <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/products"
            className="flex items-center gap-3 p-3.5 rounded-2xl neu-btn font-semibold text-xs text-foreground group"
          >
            <div className="w-9 h-9 rounded-xl neu-inset-sm bg-primary/10 flex items-center justify-center text-primary dark:text-purple-400 border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span>Add New Product</span>
          </a>
          <a
            href="/collections"
            className="flex items-center gap-3 p-3.5 rounded-2xl neu-btn font-semibold text-xs text-foreground group"
          >
            <div className="w-9 h-9 rounded-xl neu-inset-sm bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <FolderPlus className="w-4 h-4" />
            </div>
            <span>Create Collection</span>
          </a>
          <a
            href="/products"
            className="flex items-center gap-3 p-3.5 rounded-2xl neu-btn font-semibold text-xs text-foreground group"
          >
            <div className="w-9 h-9 rounded-xl neu-inset-sm bg-amber-500/10 flex items-center justify-center text-amber-500 dark:text-amber-400 border border-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span>View Low Stock</span>
          </a>
          <a
            href="/inventory"
            className="flex items-center gap-3 p-3.5 rounded-2xl neu-btn font-semibold text-xs text-foreground group"
          >
            <div className="w-9 h-9 rounded-xl neu-inset-sm bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span>Update Inventory</span>
          </a>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi) => {
          const Icon = getIcon(kpi.title);
          return (
            <div key={kpi.title} className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kpi.title}</span>
                <div className="w-11 h-11 rounded-2xl neu-inset-sm flex items-center justify-center text-primary">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-extrabold text-foreground tracking-tight">{kpi.value}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {kpi.isPositive ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs font-bold ${kpi.isPositive ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-500'}`}>
                    {kpi.change}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {kpi.subtitle || 'vs previous period'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales & Profit Line Chart */}
        <div className="bg-card neu-extruded p-7 rounded-3xl border border-border/10 lg:col-span-2 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-foreground tracking-tight">Sales Performance</h3>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              {timeRange === 'today'
                ? "Today's hourly revenue trend (IST)"
                : timeRange === '30d'
                ? "Daily revenue trend (Last 30 Days)"
                : timeRange === 'all'
                ? "Monthly revenue trend (All Time)"
                : "Daily revenue trend (Last 7 Days)"}
            </span>
          </div>
          <div className="h-80 w-full neu-inset p-4 rounded-2xl border border-border/20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 12, right: 15, left: 15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  width={50}
                  tickFormatter={(val: number) => {
                    if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`;
                    if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return String(val);
                  }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'rgba(163, 177, 198, 0.4)', borderRadius: '16px', boxShadow: 'var(--neu-shadow-extruded-sm)' }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#7c3aed" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  dot={{ r: 3.5, fill: '#7c3aed', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 5.5, fill: '#7c3aed', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Pie Chart */}
        <div className="bg-card neu-extruded p-7 rounded-3xl border border-border/10 flex flex-col gap-6">
          <h3 className="font-extrabold text-foreground tracking-tight">Fragrance Categories</h3>
          <div className="h-60 w-full flex justify-center items-center">
            {categoryData.length === 0 ? (
              <span className="text-xs text-muted-foreground">No category data available</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'rgba(163, 177, 198, 0.4)', borderRadius: '16px', boxShadow: 'var(--neu-shadow-extruded-sm)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend list */}
          <div className="flex justify-around items-center mt-2 flex-wrap gap-2">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 neu-inset-sm px-2.5 py-1 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs font-semibold text-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Widgets (Recent Orders) */}
      <div className="bg-card neu-extruded p-7 rounded-3xl border border-border/10 w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-extrabold text-foreground tracking-tight">Recent Orders</h3>
          <a
            href="/orders"
            className="text-xs font-bold text-primary neu-btn px-3.5 py-1.5 rounded-xl transition"
          >
            See All Orders →
          </a>
        </div>
        <div className="overflow-x-auto neu-inset p-3 rounded-2xl border border-border/20">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground font-bold text-xs uppercase tracking-wider">
                <th className="p-3">Order Number</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground font-medium">
                    No orders logged in store database yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-primary/[0.04] transition duration-150">
                    <td className="p-3 font-bold text-foreground font-mono text-xs">{order.orderNo}</td>
                    <td className="p-3 text-muted-foreground font-medium">{order.customer}</td>
                    <td className="p-3 text-foreground font-bold">{order.total}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold neu-inset-sm ${
                        order.status === 'Paid' ? 'text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10' :
                        order.status === 'Processing' ? 'text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 bg-indigo-500/10' :
                        order.status === 'Shipped' ? 'text-purple-600 dark:text-purple-300 border border-purple-500/30 bg-purple-500/10' :
                        order.status === 'Delivered' ? 'text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10' :
                        'text-amber-800 dark:text-amber-300 border border-amber-500/30 bg-amber-500/10'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground text-xs font-medium">
                      {new Date(order.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Sellers + Low Stock Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Selling Products Leaderboard */}
        <div className="bg-card neu-extruded p-7 rounded-3xl border border-border/10 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span>Top Selling Perfumes</span>
            </h3>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">This Month</span>
          </div>
          <div className="flex flex-col gap-3">
            {topProducts.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-center text-xs text-muted-foreground font-medium">
                No product sales recorded yet.
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={p.id} className="p-4 neu-inset rounded-2xl border border-border/20 flex items-center justify-between hover:border-primary/40 transition duration-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl neu-extruded-sm flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      idx === 0 ? 'text-amber-500' :
                      idx === 1 ? 'text-zinc-400' :
                      'text-amber-700'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-foreground truncate">{p.title}</span>
                      <span className="text-xs text-muted-foreground">{p.salesCount} bottles sold</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">{p.revenue}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card neu-extruded p-7 rounded-3xl border border-border/10 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Low Stock Alerts</span>
            </h3>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Action Needed</span>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-80 pr-1">
            {lowStock.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-center text-xs text-muted-foreground font-medium">
                All catalog items are healthy and fully stocked!
              </div>
            ) : (
              lowStock.map((item) => (
                <div key={item.id} className="p-4 neu-inset rounded-2xl border border-border/20 flex justify-between items-center gap-4 hover:border-red-500/30 transition duration-200">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-bold text-foreground truncate">{item.title}</span>
                    <span className="text-xs text-muted-foreground font-mono truncate">SKU: {item.sku}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-bold px-3 py-1 rounded-full neu-inset-sm text-red-500 border border-red-500/20">
                      {item.stock} left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


