'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { 
  Search, 
  Loader2,
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
  const filteredOrders = orderList.filter(o => 
    o.order_number.toLowerCase().includes(search.toLowerCase()) || 
    o.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Fulfill incoming paid orders and dispatch Shiprocket tracking codes</p>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders by number or customer..."
            className="w-full pl-11 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
          />
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="h-60 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="p-5">Order ID</th>
                  <th className="p-5">Date</th>
                  <th className="p-5">Customer Name</th>
                  <th className="p-5">Total</th>
                  <th className="p-5">Payment Status</th>
                  <th className="p-5">Fulfillment Status</th>
                  <th className="p-5">Item Quantity</th>
                  <th className="p-5">Delivery Method</th>
                  <th className="p-5">Payment Method</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-muted-foreground">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/10 transition duration-150">
                      <td className="p-5">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-semibold text-primary hover:text-primary/80 transition duration-150 hover:underline cursor-pointer"
                        >
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="p-5 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-5">
                        <div className="font-medium text-foreground">{order.customer_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{order.customer_email}</div>
                      </td>
                      <td className="p-5 font-semibold text-foreground">
                        ₹{parseFloat(order.total).toLocaleString('en-IN')}
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          order.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' :
                          order.payment_status === 'Refunded' ? 'bg-amber-500/10 text-amber-400' :
                          order.payment_status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          order.fulfillment_status === 'Delivered' ? 'bg-teal-500/10 text-teal-400' :
                          order.fulfillment_status === 'Shipped' ? 'bg-purple-500/10 text-purple-400' :
                          order.fulfillment_status === 'Processing' ? 'bg-indigo-500/10 text-indigo-400' :
                          order.fulfillment_status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {order.fulfillment_status}
                        </span>
                      </td>
                      <td className="p-5 text-center font-medium text-foreground">
                        {order.item_quantity}
                      </td>
                      <td className="p-5 text-muted-foreground">
                        {order.delivery_method}
                      </td>
                      <td className="p-5">
                        <span className="px-2 py-1 bg-muted rounded text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
