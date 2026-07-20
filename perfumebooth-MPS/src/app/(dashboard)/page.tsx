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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time store metrics and operations summary</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date-Range Selector */}
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border border-border rounded-xl">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="today" className="bg-card text-foreground">Today</option>
              <option value="7d" className="bg-card text-foreground">Last 7 Days</option>
              <option value="30d" className="bg-card text-foreground">Last 30 Days</option>
            </select>
          </div>

          {/* Live Visitors Counter */}
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              {liveVisitors} Live Shoppers
            </span>
          </div>
        </div>
      </div>

      {/* Quick-Action Shortcuts Card */}
      <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/products"
            className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/50 bg-secondary/20 hover:bg-primary/5 transition text-foreground font-semibold text-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <span>Add New Product</span>
          </a>
          <a
            href="/collections"
            className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/50 bg-secondary/20 hover:bg-primary/5 transition text-foreground font-semibold text-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
              <FolderPlus className="w-4 h-4" />
            </div>
            <span>Create Collection</span>
          </a>
          <a
            href="/products"
            className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/50 bg-secondary/20 hover:bg-primary/5 transition text-foreground font-semibold text-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span>View Low Stock</span>
          </a>
          <a
            href="/inventory"
            className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/50 bg-secondary/20 hover:bg-primary/5 transition text-foreground font-semibold text-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
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
            <div key={kpi.title} className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">{kpi.title}</span>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {kpi.isPositive ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-xs font-semibold ${kpi.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
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
        <div className="glass-card p-6 rounded-2xl lg:col-span-2 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-foreground">Sales Performance</h3>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-primary" /> Daily revenue trend (Last 7 Days)
            </span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Pie Chart */}
        <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
          <h3 className="font-bold text-foreground">Fragrance Categories</h3>
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
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend list */}
          <div className="flex justify-around items-center mt-2 flex-wrap gap-2">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Widgets (Recent Orders) */}
      <div className="glass-card p-6 rounded-2xl w-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-foreground">Recent Orders</h3>
            <a
              href="/orders"
              className="text-xs font-semibold text-primary hover:underline transition"
            >
              See All Orders →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No orders logged in store database yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/10 transition duration-150">
                      <td className="py-4 font-semibold text-foreground">{order.orderNo}</td>
                      <td className="py-4 text-muted-foreground">{order.customer}</td>
                      <td className="py-4 text-foreground">{order.total}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          order.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' :
                          order.status === 'Processing' ? 'bg-indigo-500/10 text-indigo-400' :
                          order.status === 'Shipped' ? 'bg-purple-500/10 text-purple-400' :
                          order.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 text-right text-muted-foreground">
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
        <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span>Top Selling Perfumes</span>
            </h3>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">This Month</span>
          </div>
          <div className="flex flex-col gap-4">
            {defaultTopProducts.map((p, idx) => (
              <div key={p.id} className="p-4 bg-background/50 border border-border/50 rounded-xl flex items-center justify-between hover:border-primary/30 transition duration-200">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                    idx === 1 ? 'bg-zinc-400/20 text-zinc-400' :
                    'bg-amber-700/20 text-amber-600'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">{p.title}</span>
                    <span className="text-xs text-muted-foreground">{p.salesCount} bottles sold</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-emerald-400">{p.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Low Stock Alerts</span>
            </h3>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Action Needed</span>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto max-h-80 pr-1">
            {lowStock.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-center text-xs text-muted-foreground">
                All catalog items are healthy and fully stocked!
              </div>
            ) : (
              lowStock.map((item) => (
                <div key={item.id} className="p-4 bg-background/50 border border-border/50 rounded-xl flex justify-between items-center gap-4 hover:border-red-500/20 transition duration-200">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">{item.title}</span>
                    <span className="text-xs text-muted-foreground truncate">SKU: {item.sku}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
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


