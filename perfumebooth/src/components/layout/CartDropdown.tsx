"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { AnimatedShoppingBag as ShoppingBag } from "@/components/ui/icons/AnimatedShoppingBag";
import { AnimatedX as X } from "@/components/ui/icons/AnimatedX";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import { cleanImageUrl } from "@/lib/media-url";

// ─── Animation Variants ───────────────────────────────────────────────────────

const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: "easeOut",
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -4,
    transition: { duration: 0.1, ease: "easeIn" },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -4 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.12 } },
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CartDropdown({ 
  trigger, 
  href 
}: { 
  trigger?: React.ReactNode | ((open: boolean) => React.ReactNode);
  href?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.cartTotal());
  const totalQuantity = useCartStore((s) => s.totalQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 300);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const triggerContent = typeof trigger === "function" ? trigger(open) : trigger;

  return (
    <div 
      ref={containerRef} 
      className="relative" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Trigger ───────────────────────────────────────────────────────── */}
      {href ? (
        <Link href={href} className="block cursor-pointer">
          {triggerContent}
        </Link>
      ) : (
        <div onClick={() => setOpen(v => !v)} className="cursor-pointer">
          {triggerContent}
        </div>
      )}

      {/* ── Dropdown Panel ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 mt-3 w-80 z-[110] rounded-xl overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card-hover)",
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-bottom" style={{ background: "var(--color-bg-subtle)", borderBottom: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-[var(--color-gold)]" />
                <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-primary)" }}>My Cart</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[var(--color-border)]" style={{ color: "var(--color-gold)" }}>
                {totalQuantity} {totalQuantity === 1 ? "Item" : "Items"}
              </span>
            </div>

            {/* Cart Items List */}
            <div className="max-h-[320px] overflow-y-auto px-2 py-2 custom-scrollbar">
              {items.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-bg-subtle)] flex items-center justify-center mb-3">
                    <ShoppingBag size={20} className="text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-[12px] font-medium text-[var(--color-text-muted)]">Your cart is empty</p>
                  <Link 
                    href="/shop" 
                    className="mt-3 text-[11px] font-bold uppercase tracking-widest text-[var(--color-gold)] hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {items.map((item) => (
                    <motion.div 
                      key={`${item.id}-${item.selectedVariantId}`}
                      variants={itemVariants}
                      className="group flex gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-subtle)] transition-colors relative"
                    >
                      <Link 
                        href={`/products/${item.handle}`} 
                        onClick={() => setOpen(false)}
                        className="relative w-16 h-20 flex-shrink-0 bg-white rounded-md border border-[var(--color-border)] overflow-hidden hover:opacity-90 transition-opacity block"
                      >
                        <Image
                          src={cleanImageUrl(typeof item.image === "string" ? item.image : ((item.image as any)?.url || (item as any).featuredImage?.url)) || "/images/fallback-luxury.svg"}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </Link>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <Link 
                          href={`/products/${item.handle}`} 
                          className="text-[12px] font-bold leading-tight truncate hover:text-[var(--color-gold)] transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          {item.title}
                        </Link>
                        {item.selectedVariantTitle && item.selectedVariantTitle !== "Default Title" && (
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{item.selectedVariantTitle}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[11px] font-bold">
                            <span className="text-[var(--color-text-muted)] font-medium">{item.cartQuantity} × </span>
                            {formatPrice(typeof item.price === 'string' ? parseFloat(item.price) : item.price)}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id, item.selectedVariantId)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-[var(--color-border)] shrink-0"
                      >
                        <X size={10} className="text-red-500" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 border-t" style={{ borderColor: "var(--color-border)", background: "var(--color-bg-subtle)" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[12px] font-medium text-[var(--color-text-muted)]">Subtotal</span>
                  <span className="text-[15px] font-bold" style={{ color: "var(--color-text-primary)" }}>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/cart"
                    onClick={() => setOpen(false)}
                    className="w-full text-center py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest border transition-all"
                    style={{ 
                      borderColor: "var(--color-gold)", 
                      color: "var(--color-gold)",
                      background: "white"
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = "var(--color-bg-subtle)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = "white";
                    }}
                  >
                    View Cart
                  </Link>
                  <Link
                    href="/checkout"
                    onClick={() => setOpen(false)}
                    className="w-full text-center py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest text-white shadow-md transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.filter = "brightness(1.1)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.filter = "none";
                    }}
                  >
                    Checkout Now
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
