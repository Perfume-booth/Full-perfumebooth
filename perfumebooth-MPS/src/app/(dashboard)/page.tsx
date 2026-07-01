'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// Mock Analytics Data
const salesData = [
  { name: 'Jan', sales: 4000, profit: 2400 },
  { name: 'Feb', sales: 3000, profit: 1398 },
  { name: 'Mar', sales: 9800, profit: 8000 },
  { name: 'Apr', sales: 2780, profit: 1800 },
  { name: 'May', sales: 1890, profit: 9800 },
  { name: 'Jun', sales: 2390, profit: 3800 },
  { name: 'Jul', sales: 3490, profit: 4300 },
];

const categoryData = [
  { name: 'Floral', value: 400, color: '#8b5cf6' },
  { name: 'Citrus', value: 300, color: '#ec4899' },
  { name: 'Woody', value: 300, color: '#10b981' },
  { name: 'Spicy', value: 200, color: '#f59e0b' },
];

const recentOrders = [
  { id: '1', orderNo: 'ORD-9482', customer: 'Aarav Sharma', total: '₹4,999.00', status: 'Paid', date: '2 mins ago' },
  { id: '2', orderNo: 'ORD-9481', customer: 'Priya Patel', total: '₹2,499.00', status: 'Processing', date: '15 mins ago' },
  { id: '3', orderNo: 'ORD-9480', customer: 'Vikram Singh', total: '₹8,120.00', status: 'Shipped', date: '1 hour ago' },
  { id: '4', orderNo: 'ORD-9479', customer: 'Neha Reddy', total: '₹3,750.00', status: 'Pending', date: '3 hours ago' },
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const kpis = [
    { title: 'Total Revenue', value: '₹348,250.00', change: '+12.5%', isPositive: true, icon: DollarSign },
    { title: 'Total Orders', value: '1,482', change: '+8.2%', isPositive: true, icon: ShoppingBag },
    { title: 'Active Customers', value: '984', change: '-2.1%', isPositive: false, icon: Users },
    { title: 'Net Profit Margin', value: '24.8%', change: '+4.3%', isPositive: true, icon: Percent },
  ];

  if (!mounted) return <div className="h-screen w-full bg-background animate-pulse"></div>;

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time store metrics and operations summary</p>
        </div>
        <button className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm">
          Export Report
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
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
              <TrendingUp className="w-4 h-4 text-primary" /> Monthly trends
            </span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          <h3 className="font-bold text-foreground">Popular Categories</h3>
          <div className="h-60 w-full flex justify-center items-center">
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

      {/* Bottom Table Section */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-foreground">Recent Orders</h3>
          <button className="text-xs text-primary font-semibold hover:underline">
            View All Orders
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-semibold">
                <th className="pb-3">Order Number</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Total Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/10 transition duration-150">
                  <td className="py-4 font-semibold text-foreground">{order.orderNo}</td>
                  <td className="py-4 text-muted-foreground">{order.customer}</td>
                  <td className="py-4 text-foreground">{order.total}</td>
                  <td className="py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      order.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' :
                      order.status === 'Processing' ? 'bg-indigo-500/10 text-indigo-400' :
                      order.status === 'Shipped' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 text-right text-muted-foreground">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
