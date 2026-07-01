"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import { AnimatedMinus } from "@/components/ui/icons/AnimatedMinus";
import { AnimatedPlus } from "@/components/ui/icons/AnimatedPlus";
import { AnimatedX } from "@/components/ui/icons/AnimatedX";
import { AnimatedShoppingBag } from "@/components/ui/icons/AnimatedShoppingBag";
import { AnimatedTruck } from "@/components/ui/icons/AnimatedTruck";
import { AnimatedShield } from "@/components/ui/icons/AnimatedShield";
import { AnimatedRotateCcw } from "@/components/ui/icons/AnimatedRotateCcw";
import { AnimatedChevronRight } from "@/components/ui/icons/AnimatedChevronRight";
import { AnimatedArrowLeft } from "@/components/ui/icons/AnimatedArrowLeft";
import { AnimatedGift } from "@/components/ui/icons/AnimatedGift";
import { AnimatedBadgePercent } from "@/components/ui/icons/AnimatedBadgePercent";
import { AnimatedPackage } from "@/components/ui/icons/AnimatedPackage";
import { motion, AnimatePresence } from "framer-motion";

export default function CartPageClient() {
  const { 
    items, 
    updateQuantity, 
    removeFromCart, 
    applyCoupon, 
    couponCode, 
    couponDiscount,
    subtotalAmount,
    totalAmount,
    discountAmount: storeDiscountAmount,
    discountErrorMessage,
    isApplyingDiscount,
    selectedShippingRate,
    finalTotalAmount,
    cartTotal
  } = useCartStore();
  const router = useRouter();

  const [couponInput, setCouponInput] = useState(couponCode || "");
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const subtotal = subtotalAmount > 0 ? subtotalAmount : cartTotal();
  const discountAmt = subtotalAmount > 0 ? storeDiscountAmount : (subtotal * couponDiscount) / 100;
  const grandTotal = finalTotalAmount();
  const totalItems = items.reduce((s, i) => s + i.cartQuantity, 0);

  const totalMRP = items.reduce((sum, item) => {
    const mrp = item.has_discount && item.discount_price ? parseFloat(item.discount_price) : parseFloat(item.price);
    return sum + mrp * item.cartQuantity;
  }, 0);
  const productDiscount = Math.max(0, totalMRP - subtotal);

  const handleApplyCoupon = async () => {
    const upper = couponInput.trim().toUpperCase();
    if (!upper) {
      await applyCoupon("");
      setCouponMsg({ type: "success", text: "Coupon cleared." });
      setTimeout(() => setCouponMsg(null), 4000);
      return;
    }
    const success = await applyCoupon(upper);
    if (success) {
      const state = useCartStore.getState();
      const updatedDiscountAmt = state.discountAmount;
      setCouponMsg({ type: "success", text: `Coupon "${upper}" applied! Saved ${formatPrice(updatedDiscountAmt)}.` });
    } else {
      const state = useCartStore.getState();
      const errorMsg = state.discountErrorMessage || `Discount code "${upper}" is invalid or not applicable.`;
      setCouponMsg({ type: "error", text: errorMsg });
    }
    setTimeout(() => setCouponMsg(null), 4000);
  };

  const handleRemove = (id: string | number, variantId?: string) => {
    const key = `${id}-${variantId || ""}`;
    setRemovingId(key);
    setTimeout(() => {
      removeFromCart(id, variantId);
      setRemovingId(null);
    }, 300);
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center pt-20">
        <div className="text-center max-w-md mx-auto px-6 py-20">
          <div className="w-32 h-32 mx-auto mb-8 bg-white rounded-full flex items-center justify-center shadow-sm">
            <AnimatedShoppingBag size={52} className="text-gray-200" animateOn="hover" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Your cart is empty</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Looks like you haven't added anything yet. Explore our curated fragrance collection.
          </p>
          <Link
            href="/all"
            className="inline-flex items-center gap-2 bg-[var(--color-gold)] text-white px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-[var(--color-gold-dark)] transition-colors shadow-md"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] pt-28">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-6">

        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full transition-colors">
            <AnimatedArrowLeft size={20} className="text-gray-600" animateOn="hover" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              My Cart <span className="text-[var(--color-text-muted)] font-normal text-base">({totalItems} items)</span>
            </h1>
          </div>
        </div>

        {/* Delivery Banner */}
        <div className="bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
          <AnimatedTruck size={18} className="text-[var(--color-success)] flex-shrink-0" animateOn="view" />
          <p className="text-sm text-[var(--color-success)] font-medium">
            Free delivery on all orders above ₹999
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* ──── LEFT: Cart Items ──── */}
          <div className="space-y-4">
            <AnimatePresence>
              {items.map((item) => {
                const key = `${item.id}-${item.selectedVariantId || ""}`;
                const activePrice = parseFloat(item.price);
                const originalPrice = item.has_discount && item.discount_price
                  ? parseFloat(item.discount_price)
                  : null;
                const discountPct = originalPrice
                  ? Math.round(((originalPrice - activePrice) / originalPrice) * 100)
                  : null;
                const lineTotal = activePrice * item.cartQuantity;
                const isRemoving = removingId === key;

                return (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: isRemoving ? 0 : 1, scale: isRemoving ? 0.97 : 1 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-[var(--color-surface)] rounded-lg shadow-[var(--shadow-card)] overflow-hidden"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex gap-4">

                        {/* Product Image */}
                        <Link href={`/products/${item.handle}`} className="relative w-24 h-32 sm:w-32 sm:h-40 flex-shrink-0 bg-[#f7f7f7] rounded-md overflow-hidden hover:opacity-90 transition-opacity">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 96px, 128px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <AnimatedPackage size={32} className="text-gray-200" animateOn="view" />
                            </div>
                          )}
                          {discountPct && discountPct > 0 && (
                            <div className="absolute top-1 left-1 bg-[var(--color-sale)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {discountPct}% OFF
                            </div>
                          )}
                        </Link>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {item.brand && (
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                  {item.brand}
                                </p>
                              )}
                              <Link href={`/products/${item.handle}`}>
                                <h3 className="font-semibold text-gray-800 text-sm sm:text-base leading-snug line-clamp-2 hover:text-[var(--color-gold)] transition-colors">
                                  {item.title}
                                </h3>
                              </Link>
                              <p className="text-xs text-gray-400 mt-1">
                               {(item.selectedVariantTitle && item.selectedVariantTitle !== "Default Title") ? item.selectedVariantTitle : (item.size_ml ? `${item.size_ml}ml` : null)} {item.concentration ? `· ${item.concentration}` : ""}
                              </p>
                              
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {item.requiresShipping !== false && (
                                  <span className="inline-flex items-center text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/50 px-1.5 py-0.5 rounded tracking-wide uppercase">
                                    📦 Ships in 3-5 days
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemove(item.id, item.selectedVariantId)}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-sale)] hover:bg-[var(--color-sale-bg)] rounded-full transition-colors flex-shrink-0"
                              aria-label="Remove item"
                            >
                              <AnimatedX size={16} animateOn="hover" />
                            </button>
                          </div>

                          {/* Pricing */}
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-lg font-bold text-gray-900">
                              {formatPrice(activePrice)}
                            </span>
                            {originalPrice && (
                              <span className="text-sm text-gray-400 line-through">
                                {formatPrice(originalPrice)}
                              </span>
                            )}
                            {discountPct && discountPct > 0 ? (
                              <span className="text-sm font-semibold text-[var(--color-sale)]">
                                {discountPct}% off
                              </span>
                            ) : null}
                          </div>

                          {/* Stock Hint */}
                          {item.stock_count <= 5 && (
                            <p className="text-xs text-[var(--color-sale)] mt-1 font-medium">
                              Only {item.stock_count} left – order soon!
                            </p>
                          )}

                          {/* Quantity + Line Total */}
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center border border-gray-200 rounded-sm overflow-hidden">
                              <button
                                onClick={() => updateQuantity(item.id, item.cartQuantity - 1, item.selectedVariantId)}
                                disabled={item.cartQuantity <= 1}
                                className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-gray-200"
                                aria-label="Decrease quantity"
                              >
                                <AnimatedMinus size={13} animateOn="hover" />
                              </button>
                              <span className="w-10 h-9 flex items-center justify-center text-sm font-semibold text-gray-800 bg-white">
                                {item.cartQuantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.cartQuantity + 1, item.selectedVariantId)}
                                disabled={item.cartQuantity >= (item.stock_count || 50)}
                                className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-200"
                                aria-label="Increase quantity"
                              >
                                <AnimatedPlus size={13} animateOn="hover" />
                              </button>
                            </div>
                            <div className="text-right">
                              {item.cartQuantity > 1 && (
                                <span className="text-xs text-gray-400 font-normal block mb-0.5">
                                  {formatPrice(activePrice)} x {item.cartQuantity}
                                </span>
                              )}
                              <span className="text-sm font-bold text-gray-700">
                                {formatPrice(lineTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Info Row */}
                    <div className="border-t border-[var(--color-border)]/50 px-4 sm:px-6 py-2.5 flex items-center gap-2 bg-[var(--color-bg-subtle)]/30">
                      <AnimatedTruck size={13} className="text-[var(--color-success)]" animateOn="view" />
                      <span className="text-[11px] text-gray-500">
                        Delivery by <span className="font-semibold text-gray-700">3–5 business days</span>
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ──── RIGHT: Price Summary ──── */}
          <aside className="space-y-4">


            {/* Price Breakdown */}
            <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5">
              <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-4">
                Price Details ({totalItems} {totalItems === 1 ? "item" : "items"})
              </h3>

              {/* Product Breakdown List */}
              <div className="mb-5 pb-4 border-b border-dashed border-gray-200 space-y-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product Breakdown</p>
                {items.map((item) => {
                  const activePrice = parseFloat(item.price);
                  const lineTotal = activePrice * item.cartQuantity;
                  return (
                    <div key={item.id} className="flex justify-between items-start gap-4 text-xs text-gray-700">
                      <span className="font-medium flex-1">
                        {item.title} <span className="text-gray-400 font-normal whitespace-nowrap text-[10px] ml-1">({formatPrice(activePrice)} x {item.cartQuantity})</span>
                      </span>
                      <span className="font-bold text-gray-900 whitespace-nowrap">{formatPrice(lineTotal)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3.5">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Total MRP</span>
                  <span>{formatPrice(totalMRP)}</span>
                </div>
                <div className="flex justify-between text-sm text-[var(--color-success)]">
                  <span>Product Discount</span>
                  <span>{productDiscount > 0 ? `− ${formatPrice(productDiscount)}` : "₹0"}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700 border-b border-gray-100 pb-2">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-sm text-[var(--color-success)]">
                    <span>Coupon Discount {couponCode ? `(${couponCode})` : ""}</span>
                    <span>− {formatPrice(discountAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Delivery Charges</span>
                  {subtotal >= 999 ? (
                    <span className="text-[var(--color-success)] font-bold text-xs uppercase tracking-wider">Free Shipping</span>
                  ) : selectedShippingRate ? (
                    <span className="font-bold text-gray-900">{formatPrice(selectedShippingRate.amount)}</span>
                  ) : (
                    <span className="text-gray-400 text-xs italic">Calculated at next step</span>
                  )}
                </div>
                <div className="border-t border-dashed border-gray-200 pt-3.5 flex justify-between">
                  <span className="font-bold text-gray-900 text-base">Total Amount</span>
                  <span className="font-bold text-gray-900 text-base">{formatPrice(grandTotal)}</span>
                </div>
              </div>
                {(productDiscount + discountAmt) > 0 && (
                  <div className="mt-4 bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 rounded px-3 py-2">
                    <p className="text-xs text-[var(--color-success)] font-semibold flex items-center gap-1.5">
                      You are saving {formatPrice(productDiscount + discountAmt)} on this order!
                    </p>
                  </div>
                )}

              {/* Checkout CTA */}
              <Link
                href="/checkout"
                className="mt-5 w-full flex items-center justify-center gap-2 bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white font-bold py-4 rounded text-sm tracking-wide transition-colors shadow-md hover:shadow-lg"
              >
                PLACE ORDER
                <AnimatedChevronRight size={16} animateOn="hover" />
              </Link>

              {/* Trust Badges */}
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: <AnimatedShield size={16} animateOn="view" />, label: "100% Secure" },
                  { icon: <AnimatedRotateCcw size={16} animateOn="view" />, label: "Easy Returns" },
                  { icon: <AnimatedTruck size={16} animateOn="view" />, label: "Fast Delivery" },
                ].map((b) => (
                  <div key={b.label} className="flex flex-col items-center gap-1">
                    <div className="text-[#b8924a]">{b.icon}</div>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Safe Checkout */}
            <div className="bg-[var(--color-surface)] rounded-lg shadow-[var(--shadow-card)] px-5 py-4 flex items-center gap-3">
              <AnimatedShield size={20} className="text-[var(--color-success)] flex-shrink-0" animateOn="view" />
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                <span className="font-semibold text-[var(--color-text-primary)]">Safe & Secure Payments.</span> 100% authentic products. Easy returns.
              </p>
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}
