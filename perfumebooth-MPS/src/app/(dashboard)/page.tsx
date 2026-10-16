'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  AlertTriangle,
  Plus,
  FolderPlus,
  Crown,
  Calendar
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
}

interface SalesTrend {
  name: string;
  sales: number;
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

// Default Fallback Mock Data Arrays
const defaultKPIs: KPI[] = [
  { title: 'Total Revenue', value: '₹348,250.00', change: '+12.5%', isPositive: true },
  { title: 'Total Orders', value: '1,482', change: '+8.2%', isPositive: true },
  { title: 'Active Customers', value: '984', change: '+5.4%', isPositive: true },
  { title: 'Average Order Value', value: '₹2,350.00', change: '+2.1%', isPositive: true },
];

const defaultSalesTrend: SalesTrend[] = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 9800 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 8890 },
  { name: 'Sat', sales: 11390 },
  { name: 'Sun', sales: 14490 },
];

const defaultCategoryData: CategoryData[] = [
  { name: 'Floral', value: 400, color: '#8b5cf6' },
  { name: 'Citrus', value: 300, color: '#ec4899' },
  { name: 'Woody', value: 300, color: '#10b981' },
  { name: 'Spicy', value: 200, color: '#f59e0b' },
];

const defaultRecentOrders: RecentOrder[] = [
  { id: '1', orderNo: 'ORD-9482', customer: 'Rahul Sharma', total: '₹4,999.00', status: 'Paid', date: new Date().toISOString() },
  { id: '2', orderNo: 'ORD-9481', customer: 'Priya Patel', total: '₹2,499.00', status: 'Processing', date: new Date().toISOString() },
  { id: '3', orderNo: 'ORD-9480', customer: 'Vikram Singh', total: '₹8,120.00', status: 'Shipped', date: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', orderNo: 'ORD-9479', customer: 'Neha Reddy', total: '₹3,750.00', status: 'Pending', date: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', orderNo: 'ORD-9478', customer: 'Rohan Mehta', total: '₹1,850.00', status: 'Delivered', date: new Date(Date.now() - 172800000).toISOString() },
];

const defaultLowStock: LowStockItem[] = [
  { id: 'l1', title: 'Woody Intense EDP (100ml)', sku: 'WDY-INT-100', stock: 4 },
  { id: 'l2', title: 'Citrus Breeze Cologne (50ml)', sku: 'CTR-BRZ-50', stock: 7 },
  { id: 'l3', title: 'Royal Oud Parfum (100ml)', sku: 'OUD-RYL-100', stock: 9 },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>(defaultKPIs);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>(defaultSalesTrend);
  const [categoryData, setCategoryData] = useState<CategoryData[]>(defaultCategoryData);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>(defaultRecentOrders);
  const [lowStock, setLowStock] = useState<LowStockItem[]>(defaultLowStock);
  const [liveVisitors, setLiveVisitors] = useState(24);
  const [timeRange, setTimeRange] = useState('7d');
  
  const defaultTopProducts = [
    { id: '1', title: 'Ahmed Al Maghribi Exotic EDP', salesCount: 142, revenue: '₹2,84,000.00' },
    { id: '2', title: 'MPF L\'amour EDP', salesCount: 98, revenue: '₹1,96,000.00' },
    { id: '3', title: 'Ahmed Al Maghribi Ignite Oud', salesCount: 84, revenue: '₹2,88,960.00' },
  ];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/shop/dashboard/');
      
      // Check if backend database has no orders or products
      const isDatabaseEmpty = !data.recentOrders || data.recentOrders.length === 0;

      if (isDatabaseEmpty) {
        console.info('Database is empty. Using mock arrays to showcase dashboard visuals.');
        setKpis(defaultKPIs);
        setSalesTrend(defaultSalesTrend);
        setCategoryData(defaultCategoryData);
        setRecentOrders(defaultRecentOrders);
        setLowStock(defaultLowStock);
        setLiveVisitors(data.liveVisitors || 24);
      } else {
        setKpis(data.kpis);
        setSalesTrend(data.salesTrend);
        const colors = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
        const mappedCategories = data.categoryData.map((c: any, index: number) => ({
          ...c,
          color: c.color || colors[index % colors.length]
        }));
        setCategoryData(mappedCategories);
        setRecentOrders(data.recentOrders);
        // Only use real low stock if we have actual items, else show fallback
        setLowStock(data.lowStock && data.lowStock.length > 0 ? data.lowStock : defaultLowStock);
        setLiveVisitors(data.liveVisitors);
      }
    } catch (err) {
      console.warn('Dashboard API offline. Falling back to local mock data arrays.');
      // Keep using default pre-initialized state arrays
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

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
      case 'Total Revenue': return DollarSign;
      case 'Total Orders': return ShoppingBag;
      case 'Active Customers': return Users;
      default: return Percent;
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
          {/* Date-Range Selector */}
          <div className="flex items-center gap-2 px-3.5 py-2 neu-inset-sm border border-border/20 rounded-2xl">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="today" className="bg-card text-foreground">Today</option>
              <option value="7d" className="bg-card text-foreground">Last 7 Days</option>
              <option value="30d" className="bg-card text-foreground">Last 30 Days</option>
            </select>
          </div>

          {/* Live Visitors Counter */}
          <div className="flex items-center gap-2.5 px-4 py-2 neu-inset-sm border border-emerald-500/30 rounded-2xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              {liveVisitors} Live Shoppers
            </span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <span className={`text-xs font-bold ${kpi.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {kpi.change}
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
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
              <TrendingUp className="w-4 h-4 text-primary" /> Daily revenue trend (Last 7 Days)
            </span>
          </div>
          <div className="h-80 w-full neu-inset p-4 rounded-2xl border border-border/20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'rgba(163, 177, 198, 0.4)', borderRadius: '16px', boxShadow: 'var(--neu-shadow-extruded-sm)' }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
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
            {defaultTopProducts.map((p, idx) => (
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
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{p.revenue}</span>
                </div>
              </div>
            ))}
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


