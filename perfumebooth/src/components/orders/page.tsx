"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package,} from "lucide-react";
import { AnimatedShoppingCart as ShoppingCartIcon } from "@/components/ui/icons/AnimatedShoppingCart";
import { AnimatedPackage as PackageIcon } from "@/components/ui/icons/AnimatedPackage";
import { AnimatedTruck as TruckIcon } from "@/components/ui/icons/AnimatedTruck";
import { AnimatedCheckCircle2 as CheckCircle2Icon } from "@/components/ui/icons/AnimatedCheckCircle2";
import { formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";
import clsx from "clsx";

interface OrderHistoryProps {
  orders: any[];
  email: string;
}

function getDetailedStatus(fulfillment: string, financial: string, cancelReason?: string, trackingStatus?: string, cancelledAt?: string) {
  const fs = fulfillment?.toUpperCase();
  const fin = financial?.toUpperCase();
  const ts = trackingStatus?.toUpperCase();

  if (cancelReason || fin === "VOIDED" || cancelledAt) {
    return { label: "Cancelled", color: "bg-neutral-400", text: "text-neutral-500", isCancelled: true };
  }

  if (fin === "REFUNDED") {
    return { label: "Refunded", color: "bg-red-400", text: "text-red-500" };
  }

  if (ts?.includes("DELIVERED")) {
    return { label: "Delivered", color: "bg-green-600", text: "text-green-600" };
  }
  
  if (ts?.includes("OUT") || ts?.includes("DELIVERY")) {
    return { label: "Out for Delivery", color: "bg-blue-600", text: "text-blue-600" };
  }

  if (fs === "FULFILLED") {
    return { label: "Shipped", color: "bg-[#b8924a]", text: "text-[#b8924a]" };
  }
  
  if (fs === "IN_PROGRESS" || fs === "PARTIAL") {
    return { label: "Shipped", color: "bg-neutral-600", text: "text-neutral-600" };
  }
  
  return { label: "Processing", color: "bg-[#b8924a]", text: "text-[#b8924a]", isCancelled: false };
}

function MiniStepper({ status, trackingStatus }: { status: string, trackingStatus?: string }) {
  const s = status?.toUpperCase();
  const ts = trackingStatus?.toUpperCase();
  const isFulfilled = s === "FULFILLED";
  const isShipped = isFulfilled || s === "IN_PROGRESS" || s === "PARTIAL";
  const isDelivered = ts === "DELIVERED";
  const isOutForDelivery = ts?.includes("OUT") || ts?.includes("DELIVERY");
  const isRTO = ts?.includes("RTO") || ts?.includes("RETURN");
  const isException = ts?.includes("EXCEPTION");
  const isCancelled = s === "CANCELLED" || s === "RESTOCKED";

  const steps = [
    { label: "Confirmed", done: true, icon: ShoppingCartIcon, isAlert: false },
    { label: "Shipped", done: isShipped, icon: PackageIcon, isAlert: false },
    { label: "Out for Delivery", done: isOutForDelivery || isDelivered, icon: TruckIcon, isAlert: isRTO || isException },
    { label: "Delivered", done: isDelivered, icon: CheckCircle2Icon, isAlert: false },
  ];

  // If cancelled, adjust steps
  const finalSteps = [...steps];
  if (isCancelled) {
    const lastDoneIndex = finalSteps.map(s => s.done).lastIndexOf(true);
    if (lastDoneIndex !== -1) {
      const cancelledIndex = Math.min(lastDoneIndex + 1, finalSteps.length - 1);
      finalSteps[cancelledIndex] = {
        ...finalSteps[cancelledIndex],
        label: "Cancelled",
        done: true,
        isAlert: true,
        icon: PackageIcon
      };
      for (let i = cancelledIndex + 1; i < finalSteps.length; i++) {
        finalSteps[i].done = false;
      }
    }
  }

  const lastDoneIndex = finalSteps.map(s => s.done).lastIndexOf(true);

  return (
    <div className="flex items-center justify-between w-full mt-6 px-1 relative">
      {finalSteps.map((step, i) => {
        const StepIcon = step.icon;
        const isLastDone = i === lastDoneIndex;
        const isCancelledStep = isCancelled && isLastDone && step.label === "Cancelled";
        
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 relative z-10 min-w-[50px]">
                <div className={clsx(
                  "w-9 h-9 flex items-center justify-center shrink-0 transition-all duration-500 rounded-lg bg-white z-10",
                  step.done 
                    ? (isCancelledStep ? "text-red-500 border border-red-100 bg-red-50" : (step.isAlert ? "text-amber-500 border border-amber-200" : "text-[#1a1410] border border-neutral-100 shadow-sm")) 
                    : "text-neutral-200 border border-neutral-50"
                )}>
                    <StepIcon 
                      size={16} 
                      strokeWidth={step.done ? 2 : 1.5}
                      animateOn="view"
                      style={{ color: step.done ? (isCancelledStep ? "#ef4444" : (step.isAlert ? "#f59e0b" : "#1a1410")) : "#d1c5b3" }}
                    />
                  
                  {/* Active pulse */}
                  {isLastDone && !isDelivered && !isCancelled && (
                    <motion.span 
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 rounded-lg bg-[#b8924a]/20 -z-10" 
                    />
                  )}
                </div>
              <span className={`text-[8px] font-black uppercase tracking-wider text-center ${isCancelledStep ? "text-red-600" : (step.done ? "text-neutral-900" : "text-neutral-300")}`}>
                {step.label}
              </span>
            </div>
            
            {i < finalSteps.length - 1 && (
              <div className="flex-1 h-[1.5px] mx-[-10px] mb-5 bg-neutral-100 relative top-[-6px]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: finalSteps[i+1].done ? "100%" : "0%" }}
                    transition={{ duration: 1, delay: i * 0.2 }}
                    className="h-full" 
                    style={{ background: isCancelled && finalSteps[i+1].done ? "#ef4444" : "#b8924a" }}
                  />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function OrderHistoryComponent({ orders, email }: OrderHistoryProps) {
  const router = useRouter();
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getOrderUrlSlug = (orderName: string): string => {
    return encodeURIComponent(orderName.replace(/^#/, ""));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:py-35 py-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1410] mb-1">Your Orders</h1>
          <p className="text-sm text-neutral-500">Track and manage your fragrance orders</p>
        </div>
        
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="bg-neutral-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-neutral-100">
            <Package className="w-10 h-10 text-neutral-300" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1410] mb-2">No orders found</h2>
          <p className="text-neutral-500 text-sm mb-8 max-w-xs mx-auto">You haven't placed any orders yet. Start exploring our scents.</p>
          <Link
            href="/all"
            className="bg-[#1a1410] text-white px-10 py-3 rounded-full font-bold hover:bg-black transition-all inline-block text-sm uppercase tracking-widest"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const lineItems = order.lineItems?.edges.map((e: any) => e.node) || [];
            const firstItem = lineItems[0];
            const orderSlug = getOrderUrlSlug(order.name);
            const trackingStatus = order.metafields?.find((m: any) => m.key === "tracking_status")?.value;
            const status = getDetailedStatus(order.fulfillmentStatus, order.financialStatus, order.cancelReason, trackingStatus, order.cancelledAt);
            const isExpanded = expandedOrders[order.id];
            const isCancelled = status.isCancelled;

            return (
              <div 
                key={order.id} 
                className={clsx(
                  "bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all relative group",
                  isCancelled && "grayscale opacity-75 bg-neutral-50"
                )}
              >
                <div className="p-5 md:p-6 relative z-0">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Image Link to Product - needs pointer events and higher z-index */}
                    <Link 
                      href={`/products/${firstItem?.variant?.product?.handle || ""}`}
                      className="relative w-24 h-24 flex-shrink-0 mx-auto md:mx-0 bg-neutral-50 rounded-xl border border-neutral-100 p-2 block hover:opacity-80 transition-opacity z-20"
                    >
                      {firstItem?.variant?.image?.url ? (
                        <Image
                          src={firstItem.variant.image.url}
                          alt={firstItem.title}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300">
                          <Package size={32} />
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="flex-1 flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Order</span>
                          <Link 
                            href={`/orders/${orderSlug}`}
                            className="text-sm font-bold text-[#1a1410] hover:underline z-20"
                          >
                            {order.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/products/${firstItem?.variant?.product?.handle || ""}`}
                            className="text-sm font-bold text-[#1a1410] line-clamp-2 leading-tight hover:underline block z-20"
                          >
                            {firstItem?.title || "Product"}
                          </Link>
                          {isCancelled && (
                            <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-wider border border-red-100 flex-shrink-0">
                              Cancelled
                            </span>
                          )}
                        </div>
                        {lineItems.length > 1 && (
                          <p className="text-xs font-medium text-[#c5a059] mt-1">
                            + {lineItems.length - 1} more item{lineItems.length > 2 ? 's' : ''}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-500 font-medium">
                           <span>Date: {new Date(order.processedAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>

                        <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-3 min-w-[120px]">
                        <p className="text-lg font-bold text-[#1a1410]">
                          {formatPrice(parseFloat(order.totalPrice.amount))}
                        </p>
                        <div className="flex items-center gap-2 px-3 py-1 bg-neutral-50 rounded-full border border-neutral-100">
                           <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                           <span className={`text-[10px] font-bold uppercase tracking-wider ${status.text}`}>{status.label}</span>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                 
                </div>
                {/* Main Link Overlay for the whole card */}
                <Link 
                  href={`/orders/${orderSlug}`}
                  className="absolute inset-0 z-10"
                  aria-label={`View details for order ${order.name}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
