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
  Calendar,
  Download,
  Crown,
  CreditCard,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart as PieIcon,
  BarChart3
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
  Cell,
  BarChart,
  Bar
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
  orders: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface TopProduct {
  rank: number;
  title: string;
  units: number;
  revenue: string;
  sku: string;
}

interface PaymentMethod {
  method: string;
  percentage: string;
  count: string;
}

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');
  
  const [kpis, setKpis] = useState<KPI[]>([
    { title: 'Total Revenue', value: '₹348,250.00', change: '+14.2%', isPositive: true },
    { title: 'Total Orders', value: '1,482', change: '+8.5%', isPositive: true },
    { title: 'Average Order Value (AOV)', value: '₹2,350.00', change: '+3.1%', isPositive: true },
    { title: 'Order Conversion Rate', value: '3.8%', change: '+1.2%', isPositive: true },
    { title: 'Abandoned Cart Recovery', value: '24.8%', change: '+4.1%', isPositive: true },
    { title: 'Scent Quiz Match Conversion', value: '18.5%', change: '+2.3%', isPositive: true },
  ]);

  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([
    { name: 'Mon', sales: 4200, orders: 14 },
    { name: 'Tue', sales: 3800, orders: 11 },
    { name: 'Wed', sales: 9800, orders: 28 },
    { name: 'Thu', sales: 4780, orders: 16 },
    { name: 'Fri', sales: 8890, orders: 31 },
    { name: 'Sat', sales: 12400, orders: 42 },
    { name: 'Sun', sales: 15800, orders: 55 },
  ]);

  const [categoryData, setCategoryData] = useState<CategoryData[]>([
    { name: 'Eau de Parfum (EDP)', value: 520, color: '#8b5cf6' },
    { name: 'Attar & CPO', value: 310, color: '#ec4899' },
    { name: 'Scent Shots', value: 240, color: '#10b981' },
    { name: 'Oud Collection', value: 180, color: '#f59e0b' },
    { name: 'Body Mists', value: 120, color: '#3b82f6' },
  ]);

  const [topProducts, setTopProducts] = useState<TopProduct[]>([
    { rank: 1, title: 'Ahmed Al Maghribi Exotic EDP (100ml)', units: 142, revenue: '₹2,84,000.00', sku: 'AAM-EXOTIC-100' },
    { rank: 2, title: 'MPF L\'amour EDP (100ml)', units: 118, revenue: '₹2,36,000.00', sku: 'MPF-LAMOUR-100' },
    { rank: 3, title: 'Ahmed Al Maghribi Ignite Oud (60ml)', units: 94, revenue: '₹3,28,960.00', sku: 'AAM-IGNITE-60' },
    { rank: 4, title: 'Lomani Code EDP (100ml)', units: 86, revenue: '₹1,28,914.00', sku: 'LOM-CODE-100' },
    { rank: 5, title: 'Lattafa Khamrah EDP (100ml)', units: 72, revenue: '₹1,87,128.00', sku: 'LAT-KHAM-100' },
  ]);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { method: 'Cash on Delivery (COD)', percentage: '62%', count: '918 orders' },
    { method: 'Online UPI / Cards (Razorpay)', percentage: '38%', count: '564 orders' },
  ]);

  const [liveVisitors, setLiveVisitors] = useState(32);

  const fetchAnalytics = async (tf: string) => {
    try {
      setLoading(true);
      const data = await apiFetch(`/shop/analytics/?timeframe=${tf}`);
      if (data) {
        if (data.kpis) setKpis(data.kpis);
        if (data.salesTrend) setSalesTrend(data.salesTrend);
        if (data.categoryData) setCategoryData(data.categoryData);
        if (data.topProducts) setTopProducts(data.topProducts);
        if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
        if (data.liveVisitors) setLiveVisitors(data.liveVisitors);
      }
    } catch (err) {
      console.warn('Analytics API call failed. Rendering client analytics arrays.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (user) {
      fetchAnalytics(timeframe);
    }
  }, [user, timeframe]);

  const handleExportCSV = () => {
    const csvRows = [
      ['PerfumeBooth Store Analytics Report'],
      [`Generated Date: ${new Date().toLocaleDateString()}`],
      [`Timeframe Filter: ${timeframe}`],
      [''],
      ['KPI Title', 'Value', 'Growth'],
      ...kpis.map(k => [k.title, k.value, k.change]),
      [''],
      ['Top Selling Products', 'SKU', 'Units Sold', 'Revenue'],
      ...topProducts.map(p => [p.title, p.sku, p.units.toString(), p.revenue]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `perfumebooth_analytics_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return <div className="h-screen w-full bg-background animate-pulse"></div>;
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Analytics & Reports</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-primary">
              Live BI
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Deep insights into store revenue, conversion rates, fragrance trends, and customer metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-2 px-4 py-2 bg-card neu-extruded-sm border border-border/10 rounded-2xl">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="today" className="bg-card text-foreground">Today</option>
              <option value="7d" className="bg-card text-foreground">Last 7 Days</option>
              <option value="30d" className="bg-card text-foreground">Last 30 Days</option>
              <option value="90d" className="bg-card text-foreground">Last 90 Days</option>
              <option value="ytd" className="bg-card text-foreground">Year-to-Date (YTD)</option>
            </select>
          </div>

          {/* Export Report Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 neu-btn-primary font-bold rounded-2xl text-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Report (CSV)</span>
          </button>

          {/* Live Shoppers Badge */}
          <div className="flex items-center gap-2.5 px-4 py-2 bg-card neu-inset-sm border border-border/10 rounded-2xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-500">
              {liveVisitors} Live Shoppers
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 w-full flex flex-col items-center justify-center gap-3 text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-semibold text-muted-foreground">Aggregating store metrics...</span>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col justify-between gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{kpi.title}</span>
                  <div className="w-10 h-10 rounded-2xl neu-inset-sm flex items-center justify-center text-primary">
                    {idx === 0 ? <DollarSign className="w-4 h-4" /> :
                     idx === 1 ? <ShoppingBag className="w-4 h-4" /> :
                     idx === 2 ? <TrendingUp className="w-4 h-4" /> :
                     <Percent className="w-4 h-4" />}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-extrabold text-foreground">{kpi.value}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {kpi.isPositive ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs font-bold ${kpi.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                      {kpi.change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs previous period</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row 1: Sales Trajectory & Category Share */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales & Orders Area Chart */}
            <div className="bg-card neu-extruded p-7 rounded-3xl border border-border/10 lg:col-span-2 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-foreground text-lg">Revenue & Order Volume Trajectory</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Daily sales curve and order volume breakdown</p>
                </div>
                <span className="text-xs text-primary font-bold neu-inset-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" /> {timeframe.toUpperCase()}
                </span>
              </div>
              <div className="h-80 w-full neu-inset rounded-2xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="sales" name="Revenue (₹)" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Revenue Distribution Donut Chart */}
            <div className="bg-card neu-extruded p-7 rounded-3xl border border-border/10 flex flex-col gap-6">
              <div>
                <h3 className="font-extrabold text-foreground text-lg">Fragrance Category Share</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Revenue breakdown by scent type</p>
              </div>
              <div className="h-60 w-full flex justify-center items-center neu-inset rounded-2xl p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '16px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2.5">
                {categoryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs px-2 py-1 rounded-xl hover:bg-muted/20 transition">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-muted-foreground font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{item.value} bottles</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2: Top Products Leaderboard & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Products Table */}
            <div className="bg-card neu-extruded p-7 rounded-3xl border border-border/10 lg:col-span-2 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl neu-inset-sm flex items-center justify-center text-amber-500">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground text-lg">Top Selling Perfumes Leaderboard</h3>
                    <p className="text-xs text-muted-foreground">Highest revenue fragrance references</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-bold neu-inset-sm px-3 py-1 rounded-full uppercase tracking-wider">Top 5 Performers</span>
              </div>
              <div className="overflow-x-auto neu-inset rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 text-muted-foreground font-bold uppercase tracking-wider border-b border-border/20">
                    <tr>
                      <th className="p-3.5">Rank</th>
                      <th className="p-3.5">Perfume Title</th>
                      <th className="p-3.5">SKU</th>
                      <th className="p-3.5">Units Sold</th>
                      <th className="p-3.5 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {topProducts.map((p) => (
                      <tr key={p.rank} className="hover:bg-muted/10 transition">
                        <td className="p-3.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            p.rank === 1 ? 'neu-inset-sm text-amber-500 font-extrabold' :
                            p.rank === 2 ? 'neu-inset-sm text-slate-400' :
                            p.rank === 3 ? 'neu-inset-sm text-amber-700' :
                            'neu-inset-sm text-muted-foreground'
                          }`}>
                            #{p.rank}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-foreground">{p.title}</td>
                        <td className="p-3.5 font-mono text-muted-foreground">{p.sku}</td>
                        <td className="p-3.5 font-bold text-foreground">{p.units} bottles</td>
                        <td className="p-3.5 text-right font-extrabold text-emerald-500">{p.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Method Split Card */}
            <div className="bg-card neu-extruded p-7 rounded-3xl border border-border/10 flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl neu-inset-sm flex items-center justify-center text-primary">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-lg">Payment Method Split</h3>
                  <p className="text-xs text-muted-foreground">COD vs Online Payment Gateways</p>
                </div>
              </div>
              <div className="flex flex-col gap-5 my-auto">
                {paymentMethods.map((pm, idx) => (
                  <div key={idx} className="flex flex-col gap-2.5 p-4 neu-inset-sm rounded-2xl">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-foreground">{pm.method}</span>
                      <span className="font-extrabold text-primary">{pm.percentage}</span>
                    </div>
                    <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${idx === 0 ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: pm.percentage }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold">{pm.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
