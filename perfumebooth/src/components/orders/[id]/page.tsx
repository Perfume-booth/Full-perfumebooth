"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, MapPin, CreditCard, Package, Truck, Check, HelpCircle, CheckCircle2, ShoppingCart, Clock, Download } from "lucide-react";
import { AnimatedShoppingCart as ShoppingCartIcon } from "@/components/ui/icons/AnimatedShoppingCart";
import { AnimatedPackage as PackageIcon } from "@/components/ui/icons/AnimatedPackage";
import { AnimatedTruck as TruckIcon } from "@/components/ui/icons/AnimatedTruck";
import { AnimatedCheckCircle2 as CheckCircle2Icon } from "@/components/ui/icons/AnimatedCheckCircle2";
import { AnimatedMapPin as MapPinIcon } from "@/components/ui/icons/AnimatedMapPin";
import { formatPrice } from "@/lib/utils";
import clsx from "clsx";
import CancelButton from "../CancelButton";
import { motion, AnimatePresence } from "framer-motion";
import { downloadInvoice } from "../invoice";


interface OrderDetailsProps {
  order: any;
  trackingInfo?: any;
  isGuest?: boolean;
}

function OrderTimeline({
  order,
  trackingInfo,
  isShipped,
  isOutForDelivery,
  isDelivered,
  isRTO,
  isException,
  isCancelled,
  currentStatus,
  activities
}: {
  order: any,
  trackingInfo?: any,
  isShipped: boolean,
  isOutForDelivery: boolean,
  isDelivered: boolean,
  isRTO: boolean,
  isException: boolean,
  isCancelled: boolean,
  currentStatus: string,
  activities: any[]
}) {
  const pickupDate = trackingInfo?.pickupDate;
  const expectedDate = trackingInfo?.expectedDeliveryDate;
  const courierName = trackingInfo?.courierName || "";

  // Helper for Ordinals
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const dateObj = new Date(dateStr.replace(" ", "T"));
      const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString("en-US", { month: "short" });
      const year = dateObj.toLocaleDateString("en-US", { year: "2-digit" });
      return `${weekday}, ${getOrdinal(day)} ${month} '${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const dateObj = new Date(dateStr.replace(" ", "T"));
      return dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(" ", "");
    } catch (e) {
      return "";
    }
  };

  const outForDeliveryEvent = activities.find((a: any) => a.activity?.toLowerCase().includes("out for delivery"));
  const deliveredEvent = activities.find((a: any) => a.activity?.toLowerCase().includes("delivered"));

  const steps = [
    {
      label: "Order Confirmed",
      done: true,
      description: `Your order has been placed on ${formatDate(order.processedAt)}.`,
      date: formatDate(order.processedAt),
      icon: ShoppingCartIcon
    },
    {
      label: "Shipped",
      done: isShipped,
      description: isShipped ? `Your item has been picked up by ${courierName || "the courier"}.` : "Preparing for shipment.",
      date: pickupDate ? formatDate(pickupDate) : "",
      icon: PackageIcon
    },
    {
      label: isRTO ? "RTO Initiated" : (isException ? "Shipment Exception" : "Out for Delivery"),
      done: isOutForDelivery || isRTO || isException,
      description: isRTO ? "Shipment is being returned to origin." : (isException ? "A delivery exception occurred." : (isOutForDelivery ? "Your item is out for delivery." : "")),
      date: outForDeliveryEvent ? formatDate(outForDeliveryEvent.date) : "",
      isAlert: isRTO || isException,
      icon: TruckIcon
    },
    {
      label: isRTO ? "Returned" : "Delivered",
      done: isDelivered || (isRTO && currentStatus.includes("delivered")),
      description: isDelivered ? `Your item has been delivered ${deliveredEvent ? `on ${formatDate(deliveredEvent.date)}` : ""}.` : (isRTO && currentStatus.includes("delivered") ? "Returned to sender." : ""),
      location: isDelivered ? (order.shippingAddress?.city || "Customer Location") : "",
      icon: CheckCircle2Icon
    }
  ];

  // If cancelled, adjust the steps to show where it stopped
  const finalSteps = [...steps];
  if (isCancelled) {
    const lastDoneIndex = finalSteps.map(s => s.done).lastIndexOf(true);
    if (lastDoneIndex !== -1) {
      // If it's cancelled, the next step after the last successful one becomes "Cancelled"
      const cancelledIndex = Math.min(lastDoneIndex + 1, finalSteps.length - 1);
      finalSteps[cancelledIndex] = {
        ...finalSteps[cancelledIndex],
        label: "Order Cancelled",
        done: true,
        isAlert: true,
        description: `This order was cancelled on ${formatDate(order.cancelledAt || order.processedAt)}.`,
        date: formatDate(order.cancelledAt || order.processedAt),
        icon: PackageIcon
      };
      // Mark all subsequent steps as not done
      for (let i = cancelledIndex + 1; i < finalSteps.length; i++) {
        finalSteps[i].done = false;
      }
    }
  }

  return (
    <div className="space-y-12">
      {/* Quick Summary Header */}
      {(pickupDate || expectedDate || isException || isRTO) && (
        <div className={clsx(
          "flex flex-wrap gap-8 p-6 rounded-2xl border mb-8",
          isRTO || isException ? "bg-amber-50 border-amber-100" : "bg-neutral-50 border-neutral-100"
        )}>
          {pickupDate && (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Official Pickup</p>
              <p className="text-sm font-black text-[#1a1410]">{formatDate(pickupDate)}</p>
            </div>
          )}
          {expectedDate && !isRTO && (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                {isDelivered ? "Delivered On" : "Expected Delivery"}
              </p>
              <p className="text-sm font-black text-[#1a1410]">{formatDate(expectedDate)}</p>
            </div>
          )}
          {(isRTO || isException) && (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Current Alert</p>
              <p className="text-sm font-black text-amber-800 uppercase">{currentStatus}</p>
            </div>
          )}
        </div>
      )}

      <div className="relative">
        {/* Main timeline line - Precise Centering */}
        <div className="absolute left-[23px] top-4 bottom-4 w-[2px] bg-neutral-100 z-0" />

        {/* Active Progress Line Overlay */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${(finalSteps.filter(s => s.done).length - 1) * 33.3}%` }}
          className="absolute left-[23px] top-4 w-[2px] z-0 origin-top"
          style={{ background: isCancelled ? "#ef4444" : "#b8924a" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        <div className="space-y-12 relative z-10">
          {finalSteps.map((step, i) => {
            const StepIcon = step.icon;
            const isLastDone = step.done && (i === finalSteps.length - 1 || !finalSteps[i + 1].done);
            const isCancelledStep = isCancelled && isLastDone && step.label === "Order Cancelled";

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-8"
              >
                {/* Icon Container */}
                <div className="relative w-12 flex justify-center">
                  <div className={clsx(
                    "w-10 h-10 flex items-center justify-center shrink-0 transition-all duration-500 rounded-xl bg-white z-10",
                    step.done
                      ? (isCancelledStep ? "text-red-500 border-2 border-red-100 bg-red-50" : (step.isAlert ? "text-amber-500 border-2 border-amber-100 bg-amber-50" : "text-[#1a1410] border border-neutral-100 shadow-sm"))
                      : "text-neutral-200 border border-neutral-100"
                  )}>
                    <StepIcon
                      size={20}
                      strokeWidth={step.done ? 2 : 1.5}
                      animateOn="view"
                      style={{ color: step.done ? (isCancelledStep ? "#ef4444" : (step.isAlert ? "#f59e0b" : "#1a1410")) : "#d1c5b3" }}
                    />

                    {/* Active status pulse indicator */}
                    {isLastDone && !isDelivered && !isCancelled && (
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-xl bg-[#b8924a]/20 -z-10"
                      />
                    )}
                  </div>
                </div>

                <div className="flex-1 pt-1.5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1.5">
                    <p className={clsx(
                      "text-[13px] font-black uppercase tracking-tight",
                      isCancelledStep ? "text-red-600" : (step.done ? (step.isAlert ? "text-amber-700" : "text-[#1a1410]") : "text-neutral-300")
                    )}>
                      {step.label}
                    </p>
                    <AnimatePresence>
                      {step.date && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={clsx(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                            step.done ? "bg-neutral-100 text-neutral-500" : "text-neutral-200"
                          )}
                        >
                          {step.date}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <p className={clsx(
                    "text-[11px] font-medium leading-relaxed max-w-lg",
                    step.done ? "text-neutral-500" : "text-neutral-300"
                  )}>
                    {step.description}
                  </p>
                  {step.done && step.location && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-[#b8924a] uppercase tracking-[0.15em] bg-[#b8924a]/5 px-2.5 py-1.5 rounded-lg w-fit border border-[#b8924a]/10"
                    >
                      <MapPinIcon size={11} strokeWidth={2.5} animateOn="view" /> {step.location}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detailed Activity Log */}
      {activities.length > 0 && (
        <div className="mt-12 pt-12 border-t border-neutral-100">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2">
            <div className="w-1 h-1 bg-[#c5a059] rounded-full" /> Full Tracking History
          </h3>
          <div className="space-y-6">
            {activities.slice(0, 8).map((activity: any, idx: number) => (
              <div key={idx} className="flex gap-4 group">
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className={clsx(
                    "w-1.5 h-1.5 rounded-full",
                    idx === 0 ? "bg-[#c5a059]" : "bg-neutral-300"
                  )} />
                  {idx !== activities.slice(0, 8).length - 1 && <div className="w-[1px] h-full bg-neutral-100" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <p className={clsx(
                      "text-xs font-bold uppercase tracking-tight",
                      idx === 0 ? "text-[#1a1410]" : "text-neutral-500"
                    )}>
                      {activity.activity}
                    </p>
                    <p className="text-[10px] font-bold text-neutral-400">{formatDate(activity.date)} at {formatTime(activity.date)}</p>
                  </div>
                  {activity.location && (
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wide mt-0.5">{activity.location}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderDetailsComponent({ order, trackingInfo, isGuest }: OrderDetailsProps) {
  const lineItems = order.lineItems?.edges.map((e: any) => e.node) || [];

  const totalMRP = lineItems.reduce((sum: number, item: any) => {
    const unitPrice = item.variant?.price?.amount 
      ? parseFloat(item.variant.price.amount) 
      : (parseFloat(item.originalTotalPrice?.amount || "0") / item.quantity);
    const unitMRP = item.variant?.compareAtPrice?.amount 
      ? parseFloat(item.variant.compareAtPrice.amount) 
      : unitPrice;
    return sum + (unitMRP * item.quantity);
  }, 0);

  const subtotal = parseFloat(order.subtotalPrice?.amount || order.subtotalPrice || "0");
  const productDiscount = Math.max(0, totalMRP - subtotal);
  const couponDiscount = parseFloat(order.totalDiscounts || "0");
  const shipping = parseFloat(order.totalShipping || "0");
  const totalAmount = parseFloat(order.totalPrice?.amount || order.totalPrice || "0");

  const activities = trackingInfo?.data || [];
  const pickupDate = trackingInfo?.pickupDate;
  const currentStatus = trackingInfo?.status?.toLowerCase() || "";

  // Status Detection
  const isRTO = currentStatus.includes("rto") || currentStatus.includes("return") || currentStatus.includes("refused") || currentStatus.includes("seller") || currentStatus.includes("origin");
  const isException = currentStatus.includes("exception") || currentStatus.includes("failed") || currentStatus.includes("undelivered") || currentStatus.includes("not done");

  const isCancelled = !!order.cancelledAt || order.financialStatus?.toUpperCase() === "VOIDED" || order.cancelReason || order.fulfillmentStatus?.toUpperCase() === "RESTOCKED";

  const outForDeliveryEvent = activities.find((a: any) => a.activity?.toLowerCase().includes("out for delivery"));
  const deliveredEvent = activities.find((a: any) => a.activity?.toLowerCase().includes("delivered"));

  const metafieldStatus = order.metafields?.find((m: any) => m.key === "tracking_status")?.value?.toUpperCase();
  const isDelivered = !!deliveredEvent || currentStatus.includes("delivered") || metafieldStatus === "DELIVERED";
  const isOutForDelivery = !!outForDeliveryEvent || currentStatus.includes("out") || metafieldStatus?.includes("OUT");
  const isShipped = !!pickupDate || order.fulfillmentStatus?.toUpperCase() === "FULFILLED" || isDelivered || isOutForDelivery || isRTO || isException;

  const handleDownloadInvoice = () => {
    downloadInvoice(order, trackingInfo);
  };


  return (
    <div className="max-w-5xl mx-auto px-4 py-12 bg-neutral-50 min-h-screen md:mt-30 mt-10">
      {/* Back Link */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <Link href={isGuest ? "/track-order" : "/orders"} className="flex items-center gap-1 text-[11px] text-[#1a1410] font-black uppercase tracking-[0.2em] mb-3 hover:underline">
            <ChevronLeft className="w-4 h-4" />
            {isGuest ? "Back to Track Order" : "Back to Orders"}
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-[#1a1410] uppercase tracking-tighter">Order {order.name}</h1>
            <div className={clsx(
              "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-white",
              isCancelled ? "bg-neutral-400" :
                isDelivered ? "bg-green-600" :
                  isRTO ? "bg-red-600" :
                    isException ? "bg-amber-600" :
                      isOutForDelivery ? "bg-blue-600" :
                        "bg-[#c5a059]"
            )}>
              {isCancelled ? "Cancelled" : isDelivered ? "Delivered" : isRTO ? "Returned" : isException ? "Exception" : isOutForDelivery ? "Out for Delivery" : (order.fulfillmentStatus === "FULFILLED" ? "Shipped" : (order.fulfillmentStatus || "Processing"))}
            </div>
          </div>
          <p className="text-xs text-neutral-500 font-medium mt-2">Ordered on {new Date(order.processedAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })} at {new Date(order.processedAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Section: Timeline & Items */}
        <div className="lg:col-span-2 space-y-8">

          {/* Detailed Timeline - Flipkart Style */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-8 flex items-center gap-2">
              <Truck size={14} className="text-[#c5a059]" /> Order Journey
            </h2>
            <OrderTimeline
              order={order}
              trackingInfo={trackingInfo}
              isShipped={isShipped}
              isOutForDelivery={isOutForDelivery}
              isDelivered={isDelivered}
              isRTO={isRTO}
              isException={isException}
              isCancelled={isCancelled}
              currentStatus={currentStatus || (isCancelled ? "Cancelled" : "Confirmed")}
              activities={activities}
            />
          </div>

          {/* Item Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-neutral-100 bg-neutral-50/50">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                <Package size={14} className="text-[#c5a059]" /> Package Contents
              </h2>
            </div>
            {lineItems.map((item: any, i: number) => (
              <div key={i} className="p-8 border-b border-neutral-100 last:border-0 hover:bg-neutral-50/30 transition-colors">
                <div className="flex flex-col md:flex-row gap-8">
                  <Link
                    href={`/products/${item.variant?.product?.handle || ""}`}
                    className="relative w-28 h-28 flex-shrink-0 bg-white rounded-xl border border-neutral-100 p-3 shadow-sm hover:scale-105 transition-transform"
                  >
                    {item.variant?.image?.url ? (
                      <Image src={item.variant.image.url} alt={item.title} fill className="object-contain" />
                    ) : (
                      <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                        <Package className="w-10 h-10 text-neutral-300" />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <Link 
                            href={`/products/${item.variant?.product?.handle || ""}`}
                            className="text-lg font-black text-[#1a1410] line-clamp-2 leading-tight hover:underline hover:text-[#c5a059] transition-colors"
                          >
                            {item.title}
                          </Link>
                          {isCancelled && (
                            <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider border border-red-100">
                              Cancelled
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-[#c5a059] uppercase tracking-[0.1em] mb-4">
                          {item.variant?.title && `${item.variant.title} | `}
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.quantity > 1 && (
                          <span className="text-xs text-neutral-400 font-normal block mb-0.5">
                            {formatPrice(parseFloat(item.originalTotalPrice?.amount || "0") / item.quantity)} x {item.quantity}
                          </span>
                        )}
                        <p className="text-xl font-black text-[#1a1410] whitespace-nowrap">
                          {formatPrice(parseFloat(item.originalTotalPrice?.amount))}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <div className="px-3 py-1.5 bg-neutral-100 rounded-lg text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                       5 Days Return Policy
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: Address & Summary */}
        <div className="space-y-8">
          {/* Address Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="space-y-3">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                <MapPin size={14} className="text-[#c5a059]" /> Shipping To
              </h2>
              <div className="text-xs text-neutral-800 space-y-1.5">
                <p className="text-xs font-black text-[#1a1410] text-lg">{order.shippingAddress?.firstName} {order.shippingAddress?.lastName}</p>
                <p className="text-neutral-500 leading-relaxed font-bold">
                  {order.shippingAddress?.address1}, {order.shippingAddress?.address2 && order.shippingAddress.address2 + ","} {order.shippingAddress?.city}, {order.shippingAddress?.province} - {order.shippingAddress?.zip}
                </p>
                <div className="pt-4 flex flex-col gap-2">
                  <p className="text-xs font-bold text-[#1a1410] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" /> {order.shippingAddress?.phone}
                  </p>
                  <p className="text-xs font-bold text-[#1a1410] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" /> {order.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100 space-y-3">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                <CreditCard size={14} className="text-[#c5a059]" /> Payment Method
              </h2>
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-[#1a1410]">
                  {order.financialStatus?.toUpperCase() === "PAID" ? "Payment: Prepaid" : order.financialStatus?.toUpperCase() === "PENDING" ? "Payment: COD" : "Payment: " + order.financialStatus}
                </p>
                {order.financialStatus?.toUpperCase() === "PAID" && (
                  <CheckCircle2 size={18} className="text-green-600" />
                )}
              </div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em]">
                Status: {order.financialStatus?.toUpperCase() === "PAID" ? "Paid" : order.financialStatus?.toUpperCase() === "PENDING" ? "Pending" : order.financialStatus}
              </p>
            </div>
          </div>

          {/*  Order Receipt Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden font-sans">
            <div className="px-8 py-5 border-b border-neutral-100 bg-[#f9f9f9]">
              <div className="flex justify-between items-center">
                <h2 className="text-[11px] font-black uppercase text-neutral-500 tracking-[0.2em]">Order Receipt</h2>

              </div>
            </div>

            <div className="p-8 space-y-5">
              {/* Itemized List (Zomato Receipt Style) */}
              <div className="space-y-3 pb-4 border-b border-dashed border-neutral-200">
                {lineItems.map((item: any, idx: number) => {
                  const totalPrice = parseFloat(item.originalTotalPrice?.amount || "0");
                  const unitPrice = item.quantity > 0 ? totalPrice / item.quantity : 0;
                  return (
                    <div key={idx} className="flex justify-between items-center gap-4 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.variant?.image?.url ? (
                          <div className="relative w-12 h-12 rounded-lg bg-neutral-50 border border-neutral-100 overflow-hidden flex-shrink-0">
                            <Image
                              src={item.variant.image.url}
                              alt={item.title || "Product"}
                              fill
                              className="object-contain p-1"
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center flex-shrink-0 text-neutral-300">
                            <PackageIcon size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold text-neutral-800 line-clamp-1">
                            {item.title}
                          </span>
                          {item.variant?.title && item.variant.title !== "Default Title" && (
                            <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                              {item.variant.title}
                            </p>
                          )}
                          <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                            Qty: {item.quantity} × {formatPrice(unitPrice)}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-neutral-800 whitespace-nowrap">
                        {formatPrice(totalPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bill Details */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-neutral-500 font-medium">
                  <span>Item Total (MRP)</span>
                  <span>{formatPrice(totalMRP)}</span>
                </div>
                
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Product Discount Savings</span>
                  <span>{productDiscount > 0 ? `− ${formatPrice(productDiscount)}` : "₹0"}</span>
                </div>
                
                <div className="flex justify-between text-neutral-700 font-semibold border-b border-neutral-100 pb-2">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Coupon Discount {order.discountCodes?.[0]?.code ? `(${order.discountCodes[0].code})` : ""}</span>
                    <span>− {formatPrice(couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-500 font-medium">
                  <span>Delivery Charges</span>
                  <span className={clsx(
                    "font-semibold",
                    shipping === 0 ? "text-green-600 uppercase text-[10px] tracking-wider" : "text-neutral-800"
                  )}>
                    {shipping === 0 ? "Free" : formatPrice(shipping)}
                  </span>
                </div>
              </div>

              {/* Total Amount Divider */}
              <div className="pt-4 border-t border-dashed border-neutral-300">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-black text-[#1a1410] uppercase tracking-[0.2em]">Total</span>
                    <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Inclusive of all taxes</p>
                  </div>
                  <span className="text-2xl font-black text-[#1a1410] tracking-tight">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Savings Announcement */}
              {(productDiscount + couponDiscount) > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-emerald-800 font-bold">
                    🎉 You saved {formatPrice(productDiscount + couponDiscount)} on this order!
                  </p>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-2">
                <button
                  onClick={handleDownloadInvoice}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#1a1410] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#c5a059] transition-all shadow-sm active:scale-[0.98]"
                >
                  <Download size={14} />
                  Download Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {!isGuest && !isCancelled && !isDelivered && (
        <div className="flex justify-center md:justify-end mt-6">
          <div className=" p-6 rounded-2xl border border-neutral-100 shadow-sm w-full md:w-auto text-center md:text-right">
            <CancelButton
              orderId={String(order.id || "").split("/").pop() || ""}
              customerId={String(order.customer?.id || "").split("/").pop() || ""}
              fulfillmentStatus={order.fulfillmentStatus}
              cancelledAt={order.cancelledAt}
            />
            <p className="text-[10px] text-neutral-400 mt-3 font-medium">You can cancel your order before it gets shipped.</p>
          </div>
        </div>
      )}
    </div>
  );
}
