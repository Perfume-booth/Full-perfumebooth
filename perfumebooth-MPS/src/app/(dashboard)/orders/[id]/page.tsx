'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar,
  ShoppingBag,
  CreditCard,
  Truck,
  Loader2,
  Package,
  User,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  Clock,
  Printer,
  Mail,
  Phone,
  Tag
} from 'lucide-react';

interface OrderItem {
  id: string;
  product_id?: string | null;
  product_slug?: string | null;
  product_image?: string | null;
  product_title: string;
  sku: string;
  quantity: number;
  unit_price: string;
  line_total: string;
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
  items: OrderItem[];
  customer_email: string;
  customer_name: string;
}

function DeliveryProcessStepper({ order }: { order: OrderDetail }) {
  const status = order.status;
  const isCancelled = status === 'Cancelled';
  const isPaid = status === 'Paid' || status === 'Processing' || status === 'Shipped' || status === 'Delivered';
  const isProcessing = status === 'Processing' || status === 'Shipped' || status === 'Delivered';
  const isShipped = status === 'Shipped' || status === 'Delivered';
  const isDelivered = status === 'Delivered';

  const carrier = order.shipping_address?.shipping_carrier || 'Shiprocket';
  const trackingId = order.shipping_address?.tracking_number;
  const city = order.shipping_address?.city || order.shipping_address?.state || 'Destination';

  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const steps = [
    {
      label: 'Order Confirmed',
      desc: `Placed on ${orderDate}`,
      active: true,
      icon: ShoppingCart,
    },
    {
      label: 'Processing',
      desc: isProcessing ? 'Picked & Packed in Warehouse' : 'Awaiting fulfillment',
      active: isPaid || isProcessing,
      icon: Clock,
    },
    {
      label: 'Dispatched / Shipped',
      desc: isShipped 
        ? `${carrier} (${trackingId || 'Tracking assigned'})`
        : 'Awaiting dispatch',
      active: isShipped,
      icon: Package,
    },
    {
      label: 'Out for Delivery',
      desc: isShipped ? `En route to ${city}` : 'Pending transit',
      active: isShipped,
      icon: Truck,
    },
    {
      label: 'Delivered',
      desc: isDelivered ? `Delivered to customer in ${city}` : 'Expected arrival soon',
      active: isDelivered,
      icon: CheckCircle2,
    },
  ];

  if (isCancelled) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Order Cancelled</span>
            <p className="text-xs text-rose-400/80 mt-0.5">This order has been cancelled and fulfillment is stopped.</p>
          </div>
        </div>
        <span className="text-xs bg-rose-500/20 px-2.5 py-1 rounded-full font-semibold uppercase">Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Horizontal Steps Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
        {steps.map((step, i) => {
          const StepIcon = step.icon;
          return (
            <div key={i} className="flex flex-col items-center sm:items-start gap-2 relative">
              <div className="flex items-center gap-2 w-full">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold transition-all ${
                  step.active 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'bg-muted/40 text-muted-foreground border border-border'
                }`}>
                  <StepIcon className="w-4 h-4" />
                </div>
                {i < steps.length - 1 && (
                  <div className={`hidden sm:block flex-1 h-1 rounded-full ${
                    steps[i + 1].active ? 'bg-primary' : 'bg-border/60'
                  }`} />
                )}
              </div>
              <div>
                <h4 className={`text-xs font-bold ${step.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status & Shipping form state
  const [orderStatus, setOrderStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchOrderDetail = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const data: OrderDetail = await apiFetch(`/orders/${orderId}/`);
      setOrderDetail(data);
      setOrderStatus(data.status);
      setTrackingNumber(data.shipping_address?.tracking_number || '');
      setCarrier(data.shipping_address?.shipping_carrier || '');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    setSaveLoading(true);
    setSuccessMsg('');

    try {
      await apiFetch(`/orders/${orderId}/`, {
        method: 'PUT',
        body: JSON.stringify({
          status: orderStatus,
          tracking_number: trackingNumber,
          shipping_carrier: carrier
        })
      });
      setSuccessMsg('Order updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchOrderDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to update order.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-primary gap-4">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading order details...</p>
      </div>
    );
  }

  if (error || !orderDetail) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-foreground">Order Not Found</h2>
        <p className="text-muted-foreground text-sm">{error || 'Could not locate the requested order.'}</p>
        <Link
          href="/orders"
          className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition duration-200"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const shippingAddr = orderDetail.shipping_address || {};

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Back Link & Header */}
      <div className="flex flex-col gap-4">
        <Link 
          href="/orders"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium w-fit transition duration-150"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              Order #{orderDetail.order_number}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              orderDetail.status === 'Delivered' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
              orderDetail.status === 'Shipped' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
              orderDetail.status === 'Processing' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
              orderDetail.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {orderDetail.status}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl border border-border transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Order</span>
            </button>
            <p className="text-sm text-muted-foreground">
              Created on {new Date(orderDetail.created_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols) - Products & Fulfillment */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Delivery Process Journey Card */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" /> Delivery Process Journey
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Real-time status based on fulfillment & carrier tracking</p>
              </div>

              {orderDetail.shipping_address?.tracking_number && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-xl text-xs font-semibold">
                  <span>Carrier: {orderDetail.shipping_address?.shipping_carrier || 'Shiprocket'}</span>
                  <span>•</span>
                  <span className="font-mono">ID: {orderDetail.shipping_address?.tracking_number}</span>
                </div>
              )}
            </div>

            {/* Stepper component */}
            <DeliveryProcessStepper order={orderDetail} />
          </div>
          
          {/* Purchase Items Card (Products Table) */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-4">
              <ShoppingBag className="w-5 h-5 text-primary" /> Purchase Items ({orderDetail.items.length})
            </h2>

            <div className="flex flex-col divide-y divide-border/50">
              {orderDetail.items.map((item) => {
                const storefrontUrl = item.product_slug 
                  ? `http://localhost:3000/products/${item.product_slug}` 
                  : `http://localhost:3000/all`;
                const mpsCatalogUrl = `/products?search=${encodeURIComponent(item.product_title)}`;
                
                return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                    {/* Clickable Thumbnail Image */}
                    <a 
                      href={storefrontUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="View product in Storefront"
                      className="relative w-16 h-16 bg-muted/20 border border-border rounded-xl flex items-center justify-center overflow-hidden shrink-0 group cursor-pointer"
                    >
                      {item.product_image ? (
                        <Image
                          src={item.product_image}
                          alt={item.product_title}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-200"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground/50" />
                      )}
                    </a>

                    {/* Title, SKU & Clickable links */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <a 
                        href={storefrontUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-foreground hover:text-primary transition duration-150 flex items-center gap-1.5 group text-sm w-fit"
                      >
                        <span className="truncate">{item.product_title}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition duration-150 shrink-0 text-primary" />
                      </a>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>SKU: <span className="font-mono text-foreground font-medium">{item.sku || 'N/A'}</span></span>
                        <span>•</span>
                        <Link 
                          href={mpsCatalogUrl}
                          className="text-primary hover:underline text-[11px] font-medium"
                        >
                          Manage in MPS Catalog →
                        </Link>
                      </div>
                    </div>

                    {/* Quantity & Pricing */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-foreground">
                        ₹{parseFloat(item.line_total).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        ₹{parseFloat(item.unit_price).toLocaleString('en-IN')} × {item.quantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fulfillment & Logistics Card */}
          <form onSubmit={handleSaveOrder} className="glass-card rounded-2xl p-6 flex flex-col gap-6 border border-primary/20">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-4">
              <Truck className="w-5 h-5 text-primary" /> Fulfillment Status & Logistics (Shiprocket)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Order Status */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Fulfillment Status
                </label>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Shipping Carrier
                </label>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tracking ID
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. SR1029384821"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/50">
              <button
                type="submit"
                disabled={saveLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
              >
                {saveLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Update Order Logistics</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar Column (1 Col) - Customer & Summary */}
        <div className="flex flex-col gap-8">
          
          {/* Customer Info Card */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <User className="w-4 h-4 text-primary" /> Customer Details
            </h2>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{orderDetail.customer_name}</span>
              <a 
                href={`mailto:${orderDetail.customer_email}`} 
                className="flex items-center gap-2 text-primary hover:underline text-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{orderDetail.customer_email}</span>
              </a>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <MapPin className="w-4 h-4 text-primary" /> Shipping Address
            </h2>

            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{orderDetail.customer_name}</span>
              <span>{shippingAddr.street_address || shippingAddr.address1 || 'N/A'}</span>
              {shippingAddr.address2 && <span>{shippingAddr.address2}</span>}
              <span>
                {[shippingAddr.city, shippingAddr.state].filter(Boolean).join(', ')} 
                {shippingAddr.postal_code || shippingAddr.zip ? ` - ${shippingAddr.postal_code || shippingAddr.zip}` : ''}
              </span>
              {shippingAddr.country && <span>{shippingAddr.country}</span>}
              {shippingAddr.phone && (
                <a 
                  href={`tel:${shippingAddr.phone}`} 
                  className="flex items-center gap-2 pt-2 text-primary hover:underline font-medium text-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone: {shippingAddr.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Payment & Financial Summary Card */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <CreditCard className="w-4 h-4 text-primary" /> Financial Summary
            </h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Payment Method</span>
                <span className="font-semibold uppercase text-xs px-2 py-0.5 bg-muted rounded text-foreground">
                  {shippingAddr.payment_method || 'COD'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Method</span>
                <span className="text-foreground text-xs font-medium">
                  {shippingAddr.shipping_carrier || 'Standard Shipping'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground border-t border-border/50 pt-2">
                <span>Subtotal</span>
                <span className="text-foreground">₹{parseFloat(orderDetail.subtotal || '0').toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax / GST</span>
                <span className="text-foreground">₹{parseFloat(orderDetail.tax || '0').toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between font-bold text-base border-t border-border pt-3 text-foreground">
                <span>Total Amount</span>
                <span className="text-primary">₹{parseFloat(orderDetail.total || '0').toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
