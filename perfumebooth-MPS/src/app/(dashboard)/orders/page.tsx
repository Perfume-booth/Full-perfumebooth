'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { 
  Search, 
  Loader2,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react';

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  payment_status: string;
  fulfillment_status: string;
  item_quantity: number;
  delivery_method: string;
  payment_method: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<string>('all');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/orders/');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : [];
      setOrders(list);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const orderList = Array.isArray(orders) ? orders : [];

  const counts = {
    all: orderList.length,
    processing: orderList.filter(o => (o.fulfillment_status || o.status)?.toLowerCase() === 'processing').length,
    shipped: orderList.filter(o => (o.fulfillment_status || o.status)?.toLowerCase() === 'shipped').length,
    delivered: orderList.filter(o => (o.fulfillment_status || o.status)?.toLowerCase() === 'delivered').length,
    cancelled: orderList.filter(o => (o.fulfillment_status || o.status)?.toLowerCase() === 'cancelled').length,
  };

  const filteredOrders = orderList.filter(o => {
    const matchesSearch = 
      o.order_number.toLowerCase().includes(search.toLowerCase()) || 
      o.customer_name.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    if (deliveryStatus === 'all') return true;
    const currentStatus = (o.fulfillment_status || o.status)?.toLowerCase();
    return currentStatus === deliveryStatus.toLowerCase();
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Fulfill incoming paid orders and dispatch Shiprocket tracking codes</p>
      </div>

      {/* Search & Delivery Status Nav */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card neu-extruded p-4 sm:p-5 rounded-3xl border border-border/10">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders by number or customer..."
            className="w-full pl-11 pr-4 py-2.5 neu-input rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Delivery Status Nav Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 neu-inset-sm rounded-2xl overflow-x-auto shrink-0">
          {[
            { id: 'all', label: 'All Orders', icon: Layers, count: counts.all },
            { id: 'processing', label: 'Processing', icon: Clock, count: counts.processing },
            { id: 'shipped', label: 'Shipped', icon: Truck, count: counts.shipped },
            { id: 'delivered', label: 'Delivered', icon: CheckCircle2, count: counts.delivered },
            { id: 'cancelled', label: 'Cancelled', icon: XCircle, count: counts.cancelled },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = deliveryStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDeliveryStatus(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'neu-btn-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'neu-inset-sm text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="h-60 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="bg-card neu-extruded rounded-3xl overflow-hidden border border-border/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground font-bold text-xs uppercase tracking-wider">
                  <th className="p-5">Order ID</th>
                  <th className="p-5">Date</th>
                  <th className="p-5">Customer Name</th>
                  <th className="p-5">Total</th>
                  <th className="p-5">Payment Status</th>
                  <th className="p-5">Delivery Status</th>
                  <th className="p-5">Item Quantity</th>
                  <th className="p-5">Delivery Method</th>
                  <th className="p-5">Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-muted-foreground font-medium">
                      No orders found with status &quot;{deliveryStatus}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-primary/[0.03] transition duration-150">
                      <td className="p-5">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-bold text-primary hover:text-primary/80 transition duration-150 neu-btn px-2.5 py-1 rounded-xl text-xs inline-block"
                        >
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="p-5 text-muted-foreground text-xs font-medium">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-5">
                        <div className="font-bold text-foreground">{order.customer_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{order.customer_email}</div>
                      </td>
                      <td className="p-5 font-bold text-foreground">
                        ₹{parseFloat(order.total).toLocaleString('en-IN')}
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm ${
                          order.payment_status === 'Paid' ? 'text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10' :
                          order.payment_status === 'Refunded' ? 'text-amber-800 dark:text-amber-300 border border-amber-500/30 bg-amber-500/10' :
                          order.payment_status === 'Cancelled' ? 'text-rose-700 dark:text-rose-300 border border-rose-500/30 bg-rose-500/10' :
                          'text-amber-800 dark:text-amber-300 border border-amber-500/30 bg-amber-500/10'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            order.payment_status === 'Paid' ? 'bg-emerald-500' :
                            order.payment_status === 'Refunded' ? 'bg-amber-500' :
                            order.payment_status === 'Cancelled' ? 'bg-rose-500' :
                            'bg-amber-500'
                          }`} />
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm ${
                          order.fulfillment_status === 'Delivered' ? 'text-teal-600 dark:text-teal-300 border border-teal-500/30 bg-teal-500/5' :
                          order.fulfillment_status === 'Shipped' ? 'text-purple-600 dark:text-purple-300 border border-purple-500/30 bg-purple-500/5' :
                          order.fulfillment_status === 'Processing' ? 'text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 bg-indigo-500/5' :
                          order.fulfillment_status === 'Cancelled' ? 'text-rose-600 dark:text-rose-300 border border-rose-500/30 bg-rose-500/5' :
                          'text-amber-600 dark:text-amber-300 border border-amber-500/30 bg-amber-500/5'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            order.fulfillment_status === 'Delivered' ? 'bg-teal-500' :
                            order.fulfillment_status === 'Shipped' ? 'bg-purple-500' :
                            order.fulfillment_status === 'Processing' ? 'bg-indigo-500' :
                            order.fulfillment_status === 'Cancelled' ? 'bg-rose-500' :
                            'bg-amber-500'
                          }`} />
                          {order.fulfillment_status || order.status}
                        </span>
                      </td>
                      <td className="p-5 text-center font-bold text-foreground">
                        {order.item_quantity}
                      </td>
                      <td className="p-5 text-muted-foreground text-xs">
                        {order.delivery_method}
                      </td>
                      <td className="p-5">
                        <span className="px-2.5 py-1 neu-inset-sm rounded-xl text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {order.payment_method}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
