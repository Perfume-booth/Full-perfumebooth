/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { AnimatedUser as User } from "@/components/ui/icons/AnimatedUser";
import { AnimatedMapPin as MapPin } from "@/components/ui/icons/AnimatedMapPin";
import { AnimatedHelpCircle as HelpCircle } from "@/components/ui/icons/AnimatedHelpCircle";
import { AnimatedLogOut as LogOut } from "@/components/ui/icons/AnimatedLogOut";
import { AnimatedChevronRight as ChevronRight } from "@/components/ui/icons/AnimatedChevronRight";
import { AnimatedPackage as Package } from "@/components/ui/icons/AnimatedPackage";
import { logoutAction } from "@/lib/actions/auth";
import Cookies from "js-cookie";
import { useNewsletterStore } from "@/store/useNewsletterStore";
import { useWishlist } from "@/store/useWishlist";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_ITEMS: MenuItem[] = [
  { icon: User,        label: "My Profile",    href: "/account" },
  { icon: Package,     label: "My Orders",     href: "/orders" },
  { icon: MapPin,      label: "My Addresses",  href: "/account?tab=addresses" },
  // { icon: Gift,        label: "Gift Cards",    href: "/account" },
  { icon: HelpCircle,  label: "Help & Support",href: "/help" },
];

// ─── Animation Variants ───────────────────────────────────────────────────────

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: "easeOut" as const,
      staggerChildren: 0.025,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -4,
    transition: { duration: 0.1, ease: "easeIn" as const },
  },
};

const itemVariants = {
  hidden:   { opacity: 0, x: -4 },
  visible:  { opacity: 1, x: 0, transition: { duration: 0.12 } },
};

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      style={{ background: "var(--color-border)" }}
      className="my-1 h-px"
    />
  );
}

// ─── Menu Row ─────────────────────────────────────────────────────────────────

function MenuRow({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const Icon = item.icon as React.ComponentType<any>;

  const sharedStyle: React.CSSProperties = item.danger
    ? { color: "var(--color-sale)" }
    : { color: "var(--color-text-secondary)" };

  const hoverClass = item.danger
    ? "hover:bg-[var(--color-sale-bg)]"
    : "hover:bg-[var(--color-bg-subtle)]";

  const baseClass = `group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/50 ${hoverClass}`;

  const content = (
    <>
      <Icon
        size={16}
        className="shrink-0"
        style={{
          color: item.danger ? "var(--color-sale)" : "var(--color-text-muted)",
        }}
      />
      <span className="flex-1 text-left">{item.label}</span>
      {!item.danger && (
        <ChevronRight
          size={13}
          className="opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 transition-all duration-150"
          style={{ color: "var(--color-text-muted)" }}
        />
      )}
    </>
  );

  if (item.href) {
    return (
      <motion.div variants={itemVariants}>
        <Link
          href={item.href}
          onClick={onClose}
          className={baseClass}
          style={sharedStyle}
          tabIndex={0}
        >
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants}>
      <button
        onClick={() => { item.onClick?.(); onClose(); }}
        className={baseClass}
        style={sharedStyle}
        tabIndex={0}
      >
        {content}
      </button>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AccountDropdown({ trigger }: { trigger?: React.ReactNode | ((open: boolean) => React.ReactNode) }) {
  const [open,      setOpen]      = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoggedIn,setIsLoggedIn]= useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLButtonElement>(null);

  // Initialise from DOM / cookie
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      setIsLoggedIn(Cookies.get("isLoggedIn") === "true");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 300); // 300ms delay to prevent flickering
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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  async function handleLogout() { 
    setOpen(false);
    await logoutAction(); 
    useWishlist.getState().clearWishlist();
    useNewsletterStore.getState().reset();
    // Force a full page reload to clear all client-side state and re-read cookies in layouts
    window.location.href = "/";
  }

  return (
    <div 
      ref={containerRef} 
      className="relative" 
      data-account-dropdown
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >

      {/* ── Trigger ───────────────────────────────────────────────────────── */}
      {trigger ? (
        <div onClick={() => setOpen(v => !v)} className="cursor-pointer">
          {typeof trigger === "function" ? trigger(open) : trigger}
        </div>
      ) : (
        <button
          ref={triggerRef}
          onClick={() => setOpen(v => !v)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Account menu"
          className={`
            relative flex items-center justify-center transition-transform hover:-translate-y-0.5
            transition-all duration-150 outline-none p-2 rounded-full
          `}
          style={{
            background:  open ? "var(--color-bg-subtle)" : "var(--color-surface)",
            borderColor: open ? "var(--color-border-dark)" : "var(--color-border)",
            color:       open ? "var(--color-gold)"         : "var(--color-text-secondary)",
          }}
        >
          <User size={20} strokeWidth={1.75} animateOn="hover" />

          {/* Logged-in indicator */}
          {isMounted && isLoggedIn && (
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ring-1 ring-[var(--color-surface)]"
              style={{
                background: "var(--color-success)",
              }}
            />
          )}
        </button>
      )}

      {/* ── Dropdown Panel ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Account navigation"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 mt-3 w-64 z-50 rounded-lg overflow-hidden"
            style={{
              background:   "var(--color-surface)",
              border:       "1px solid var(--color-border)",
              boxShadow:    "var(--shadow-card-hover)",
            }}
          >

            {/* ── Header ────────────────────────────────────────────────────── */}
            <motion.div
              variants={itemVariants}
              className="px-4 pt-4 pb-3"
              style={{ background: "var(--color-bg-subtle)" }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, var(--color-gold-light), var(--color-gold-dark))",
                  }}
                >
                  <User size={16} className="text-white" strokeWidth={2} animateOn="hover" />
                </div>

                <div>
                  <p
                    className="text-[13px] font-semibold leading-tight"
                    style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                  >
                    Welcome back
                  </p>
                  <p
                    className="text-[11px] mt-0.5 leading-tight"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Manage your account
                  </p>
                </div>
              </div>
            </motion.div>

            <Divider />

            {/* ── Main Menu ─────────────────────────────────────────────────── */}
            <div className="px-2 py-1.5" role="none">
              {MENU_ITEMS.map(item => (
                <MenuRow key={item.label} item={item} onClose={() => setOpen(false)} />
              ))}
            </div>



            {/* ── Sign Out / Sign In ─────────────────────────────────────────── */}
            {isMounted && isLoggedIn && (
              <div className="px-2 py-1.5">
                <MenuRow
                  item={{
                    icon:    LogOut,
                    label:   "Sign Out",
                    onClick: handleLogout,
                    danger:  true,
                  }}
                  onClose={() => setOpen(false)}
                />
              </div>
            )}

            {/* ── Brand footer ──────────────────────────────────────────────── */}
            <div
              className="px-4 py-2 border-t"
              style={{
                borderColor: "var(--color-border)",
                background:  "var(--color-bg-subtle)",
              }}
            >
              <p
                className="text-[10px] text-center tracking-widest uppercase text-luxury"
                style={{ color: "var(--color-text-muted)" }}
              >
                PerfumeBooth
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
