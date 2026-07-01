'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  Search, 
  Eye, 
  Truck, 
  Loader2, 
  X, 
  MapPin, 
  Calendar,
  ShoppingBag,
  CreditCard
} from 'lucide-react';

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  subtotal: string;
  tax: string;
  total: string;
  shipping_address: Record<string, any>;
  created_at: string;
  items: {
    id: string;
    product_title: string;
    sku: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }[];
  customer_email: string;
  customer_name: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Detail Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Status & Shipping form state
  const [orderStatus, setOrderStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/orders/');
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenDetail = async (id: string) => {
    setSelectedOrderId(id);
    setDetailLoading(true);
    try {
      const data: OrderDetail = await apiFetch(`/orders/${id}/`);
      setOrderDetail(data);
      setOrderStatus(data.status);
      setTrackingNumber(data.shipping_address.tracking_number || '');
      setCarrier(data.shipping_address.shipping_carrier || '');
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setSaveLoading(true);

    try {
      await apiFetch(`/orders/${selectedOrderId}/`, {
        method: 'PUT',
        body: JSON.stringify({
          status: orderStatus,
          tracking_number: trackingNumber,
          shipping_carrier: carrier
        })
      });
      // Refresh
      fetchOrders();
      setSelectedOrderId(null);
      setOrderDetail(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update order.');
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
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
                  <th className="p-5">Customer</th>
                  <th className="p-5">Date</th>
                  <th className="p-5">Total</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/10 transition duration-150">
                      <td className="p-5 font-semibold text-foreground">#{order.order_number}</td>
                      <td className="p-5">
                        <div className="font-medium text-foreground">{order.customer_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{order.customer_email}</div>
                      </td>
                      <td className="p-5 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-5 font-semibold text-foreground">
                        ₹{parseFloat(order.total).toLocaleString('en-IN')}
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          order.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' :
                          order.status === 'Processing' ? 'bg-indigo-500/10 text-indigo-400' :
                          order.status === 'Shipped' ? 'bg-purple-500/10 text-purple-400' :
                          order.status === 'Delivered' ? 'bg-teal-500/10 text-teal-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <button
                          onClick={() => handleOpenDetail(order.id)}
                          className="flex items-center gap-2 ml-auto px-3.5 py-2 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg transition duration-200 cursor-pointer text-xs font-semibold text-foreground"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-card border border-border p-8 rounded-2xl shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Order Details
                </h2>
                {orderDetail && (
                  <p className="text-xs text-muted-foreground mt-0.5">ID: {orderDetail.order_number}</p>
                )}
              </div>
              <button 
                onClick={() => { setSelectedOrderId(null); setOrderDetail(null); }}
                className="p-2 hover:bg-muted rounded-full transition duration-200 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="h-60 flex items-center justify-center text-primary">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : orderDetail ? (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Address Summary */}
                  <div className="glass-card p-5 rounded-xl flex flex-col gap-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm border-b border-border/50 pb-2">
                      <MapPin className="w-4 h-4 text-primary" /> Shipping Info
                    </h3>
                    <div className="text-xs flex flex-col gap-1.5 text-muted-foreground">
                      <span className="font-semibold text-foreground">{orderDetail.customer_name}</span>
                      <span>{orderDetail.shipping_address.street_address}</span>
                      <span>{orderDetail.shipping_address.city}, {orderDetail.shipping_address.state} - {orderDetail.shipping_address.postal_code}</span>
                      <span>Phone: {orderDetail.shipping_address.phone}</span>
                    </div>
                  </div>

                  {/* Order Meta */}
                  <div className="glass-card p-5 rounded-xl flex flex-col gap-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm border-b border-border/50 pb-2">
                      <Calendar className="w-4 h-4 text-primary" /> Summary
                    </h3>
                    <div className="text-xs flex flex-col gap-1.5 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Date Created:</span>
                        <span className="text-foreground">{new Date(orderDetail.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Items:</span>
                        <span className="text-foreground">{orderDetail.items.reduce((acc, i) => acc + i.quantity, 0)} items</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t border-border/30 pt-1.5 text-sm text-foreground">
                        <span>Total amount:</span>
                        <span>₹{parseFloat(orderDetail.total).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="glass-card p-5 rounded-xl flex flex-col gap-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm border-b border-border/50 pb-2">
                    <ShoppingBag className="w-4 h-4 text-primary" /> Purchase Items
                  </h3>
                  <div className="flex flex-col gap-4">
                    {orderDetail.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-foreground">{item.product_title}</div>
                          <div className="text-muted-foreground mt-0.5">{item.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-foreground font-medium">₹{parseFloat(item.unit_price).toLocaleString('en-IN')} × {item.quantity}</div>
                          <div className="text-muted-foreground mt-0.5">₹{parseFloat(item.line_total).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dispatch & Fullfillment Actions */}
                <form onSubmit={handleSaveOrder} className="glass-card p-5 rounded-xl flex flex-col gap-5 border border-primary/10">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm border-b border-border/50 pb-2">
                    <Truck className="w-4 h-4 text-primary" /> Fulfillment Status & Logistics (Shiprocket)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Order Status */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Fulfillment Status</label>
                      <select
                        value={orderStatus}
                        onChange={(e) => setOrderStatus(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Shipping Carrier */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Shipping Carrier</label>
                      <input
                        type="text"
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        placeholder="e.g. Shiprocket / Delhivery"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                      />
                    </div>

                    {/* Tracking Number */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Tracking ID</label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. SR1029384821"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-border/30 pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => { setSelectedOrderId(null); setOrderDetail(null); }}
                      className="px-4 py-2 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition duration-200 cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-xs"
                    >
                      {saveLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Update Order</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">Failed to load order detail.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
