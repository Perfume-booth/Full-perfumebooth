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
  
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');
  const requestId = React.useRef(0);
  const fetchAnalytics = async (tf: string) => {
    const id = ++requestId.current;
    try {
      setLoading(true);
      setError('');
      setGeneratedAt('');
      const data = await apiFetch(`/shop/analytics/?timeframe=${tf}`);
      if (id !== requestId.current) return;
      if (!data || !Array.isArray(data.notes)) throw new Error('Invalid report response; update the backend.');
      if (data) {
        if (data.kpis) setKpis(data.kpis);
        if (data.salesTrend) setSalesTrend(data.salesTrend);
        if (data.categoryData) setCategoryData(data.categoryData);
        if (data.topProducts) setTopProducts(data.topProducts);
        if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
        setNotes(data.notes);
        setGeneratedAt(data.generatedAt);
      }
    } catch (err) {
      if (id === requestId.current) {
        setKpis([]); setSalesTrend([]); setCategoryData([]); setTopProducts([]); setPaymentMethods([]);
        setError(err instanceof Error ? err.message : 'Unable to load report');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (user) {
      fetchAnalytics(timeframe);
    }
    return () => { requestId.current++; };
  }, [user, timeframe]);

  const handleExportCSV = () => {
    if (loading || error || !generatedAt) return;
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
      [], ['Date', 'Fully paid sales INR', 'Orders placed'],
      ...salesTrend.map(d => [d.name, d.sales, d.orders]),
      [], ['Current category', 'Gross merchandise revenue INR'],
      ...categoryData.map(c => [c.name, c.value]),
      [], ['Payment method', 'Share of placed orders', 'Count'],
      ...paymentMethods.map(p => [p.method, p.percentage, p.count]),
      [], ['Generated', generatedAt], ['Timezone', 'Asia/Kolkata'],
      ...notes.map(n => [n]),
    ];

    const csvContent = '\uFEFF' + csvRows.map(row => row.map(value => {
      let cell = String(value ?? '');
      if (/^\s*[=+@-]/.test(cell) || /^[\t\r\n]/.test(cell)) cell = "'" + cell;
      return '"' + cell.replace(/"/g, '""') + '"';
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `perfumebooth_analytics_${timeframe}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
              Order data
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            INR order reports • Asia/Kolkata • Current payment status grouped by order creation date
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
            disabled={loading || !!error || !generatedAt}
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
              Visitors: Not tracked
            </span>
          </div>
        </div>
      </div>

      {error && <div role="alert" className="border border-red-500 rounded-xl p-4">Report unavailable: {error} <button className="underline ml-3" onClick={() => fetchAnalytics(timeframe)}>Retry</button></div>}
      {loading ? (
        <div className="h-64 w-full flex flex-col items-center justify-center gap-3 text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-semibold text-muted-foreground">Aggregating store metrics...</span>
        </div>
      ) : !error && generatedAt ? (
        <>
          <section className="bg-card p-5 rounded-xl text-sm">
            <h2 className="font-bold mb-2">Report definitions and limitations</h2>
            <ul className="list-disc pl-5 space-y-2">{notes.map(note => <li key={note}>{note}</li>)}</ul>
          </section>
          {topProducts.length === 0 && <p role="status" className="text-sm text-muted-foreground">No qualifying paid product sales in this period.</p>}
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
                  <h3 className="font-extrabold text-foreground text-lg">Fully paid sales by day</h3>
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
                <p className="text-xs text-muted-foreground mt-0.5">Gross merchandise revenue by current category</p>
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
                    <span className="font-bold text-foreground">₹{item.value.toLocaleString('en-IN')}</span>
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
                    <p className="text-xs text-muted-foreground">Historical line prices × quantities, before order-level adjustments</p>
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
                      <th className="p-3.5 text-right">Gross Merchandise Revenue</th>
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
                  <p className="text-xs text-muted-foreground">Share of all orders placed, including unpaid orders</p>
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
      ) : null}
    </div>
  );
}
