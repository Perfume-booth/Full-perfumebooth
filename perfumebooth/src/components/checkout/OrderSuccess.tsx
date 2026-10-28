"use client";

import React from "react";
import { motion } from "framer-motion";
import { AnimatedCheckCircle2 } from "@/components/ui/icons/AnimatedCheckCircle2";
import { AnimatedTruck } from "@/components/ui/icons/AnimatedTruck";
import { AnimatedArrowRight } from "@/components/ui/icons/AnimatedArrowRight";
import { AnimatedShoppingBag } from "@/components/ui/icons/AnimatedShoppingBag";
import { AnimatedMail } from "@/components/ui/icons/AnimatedMail";
import { AnimatedSmartphone } from "@/components/ui/icons/AnimatedSmartphone";
import { AnimatedClock } from "@/components/ui/icons/AnimatedClock";
import { AnimatedCheckCircle } from "@/components/ui/icons/AnimatedCheckCircle";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { cleanImageUrl } from "@/lib/media-url";

interface OrderSuccessProps {
  orderId: string;
  email: string;
  total: number;
  items?: any[];
}

export default function OrderSuccess({ orderId, email, total, items = [] }: OrderSuccessProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center px-4 py-24 relative overflow-hidden mt-10">
   
      {/* ─── Main Premium Card ─── */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 90 }}
        className="max-w-4xl w-full bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(26,20,16,0.04)] overflow-hidden border border-[var(--color-border)] relative z-10"
      >
        
        {/* Exclusive Confirmation Header */}
        <div className="p-8 md:p-12 text-center border-b border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg-subtle)]/30 to-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            className="w-20 h-20 bg-[var(--color-bg-subtle)] rounded-full flex items-center justify-center mx-auto mb-6 relative border border-[var(--color-gold)]/20"
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
              <AnimatedCheckCircle2 size={36} className="text-[var(--color-gold)] animate-pulse" />
            </div>
          </motion.div>

          <span className="text-[10px] tracking-[0.2em] text-[var(--color-gold)] uppercase font-bold">THANK YOU</span>
          <h1 className="text-3xl font-serif text-[var(--color-text-primary)] font-medium mt-2">Order Confirmed!</h1>
          <p className="text-[var(--color-text-secondary)] text-sm max-w-md mx-auto mt-2 leading-relaxed">
            Your purchase was successful. We are now preparing your curated fragrance selection.
          </p>
        </div>

        {/* Info & Details Body */}
        <div className="p-8 md:p-12 space-y-10">
          
          {/* Order Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-6 px-8 rounded-2xl bg-[var(--color-bg-subtle)]/40 border border-[var(--color-border)]/60">
            <div>
              <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] font-bold mb-1">Order ID</p>
              <p className="text-xs font-bold text-[var(--color-text-primary)] tracking-wide">{orderId}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] font-bold mb-1">Amount Paid</p>
              <p className="text-xs font-bold text-[var(--color-gold)]">{formatPrice(total)}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] font-bold mb-1">Confirmation Email</p>
              <p className="text-xs font-bold text-[var(--color-text-primary)] truncate" title={email}>{email}</p>
            </div>
          </div>

          
          {/* Clean Order Summary Breakdown */}
          {items.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
              <h3 className="text-xs font-bold tracking-[0.12em] text-[var(--color-text-secondary)] uppercase">Your Selection</h3>
              
              <div className="divide-y divide-[var(--color-border)]/50 border border-[var(--color-border)] rounded-2xl bg-white overflow-hidden shadow-sm">
                {items.map((item) => {
                  const activePrice = parseFloat(item.price);
                  return (
                    <div key={`${item.id}-${item.selectedVariantId}`} className="flex items-center gap-4 p-4 first:pt-4">
                      <div className="relative w-14 h-14 bg-[var(--color-bg-subtle)] border border-[var(--color-border)]/60 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <Image src={cleanImageUrl(typeof item.image === "string" ? item.image : ((item.image as any)?.url || (item as any).featuredImage?.url)) || "/images/fallback-luxury.svg"} alt={item.title} fill className="object-contain p-1.5" sizes="56px" />
                        ) : (
                          <AnimatedShoppingBag size={16} className="text-[var(--color-text-muted)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{item.title}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{(item.selectedVariantTitle && item.selectedVariantTitle !== "Default Title") ? item.selectedVariantTitle : (item.size_ml ? `${item.size_ml}ml` : item.brand)}</p>
                        <p className="text-[9px] text-[var(--color-gold)] font-bold mt-0.5">Quantity: {item.cartQuantity}</p>
                      </div>
                      <div className="text-xs font-bold text-[var(--color-text-primary)] text-right">
                        {item.cartQuantity > 1 && (
                          <span className="text-[10px] text-gray-400 font-normal block mb-0.5">
                            {formatPrice(activePrice)} x {item.cartQuantity}
                          </span>
                        )}
                        {formatPrice(activePrice * item.cartQuantity)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Beautiful Support & Notification Banner */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)]/50">
            <AnimatedMail size={20} className="text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)]">Email Confirmation Sent</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                We've sent a detailed summary of your purchase and shipment tracking information to <span className="font-semibold text-[var(--color-text-primary)]">{email}</span>.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row gap-4">
            <Link
              href={`/orders/${orderId}`}
              className="flex-1 flex items-center justify-center gap-2 border border-[var(--color-border)] hover:border-[var(--color-border-dark)] py-4 rounded-xl text-[10px] uppercase tracking-widest font-bold bg-white text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-all active:scale-98"
            >
              Track Order <AnimatedArrowRight size={14} />
            </Link>
            <Link
              href="/all"
              className="flex-1 flex items-center justify-center gap-2 bg-[#1a1410] hover:bg-[#2e241d] text-white py-4 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all active:scale-98 shadow-md hover:shadow-lg"
            >
              Continue Shopping <AnimatedShoppingBag size={14} />
            </Link>
          </div>

        </div>
      </motion.div>

      {/* Exclusive Support Info Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-[var(--color-text-muted)] text-xs text-center"
      >
        <div className="flex items-center gap-2">
          <AnimatedSmartphone size={14} className="text-[var(--color-gold)]" />
          <span>Need help? Contact Customer Support: <strong>+91 92660 30909</strong></span>
        </div>
        <div className="hidden sm:block text-[var(--color-border-dark)]">|</div>
        <div className="flex items-center gap-2">
          <AnimatedClock size={14} className="text-[var(--color-gold)] animate-pulse" />
          <span>Operational Hours: 10:00 AM - 7:00 PM IST</span>
        </div>
      </motion.div>

    </div>
  );
}
