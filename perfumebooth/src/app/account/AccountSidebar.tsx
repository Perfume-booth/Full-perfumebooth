"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatedUser } from "@/components/ui/icons/AnimatedUser";
import { AnimatedMapPin } from "@/components/ui/icons/AnimatedMapPin";
import { AnimatedShoppingBag } from "@/components/ui/icons/AnimatedShoppingBag";
import { AnimatedHeart } from "@/components/ui/icons/AnimatedHeart";
import { AnimatedLogOut } from "@/components/ui/icons/AnimatedLogOut";
import { AnimatedChevronRight } from "@/components/ui/icons/AnimatedChevronRight";
import { AnimatedShieldCheck as ShieldCheck } from "@/components/ui/icons/AnimatedShieldCheck";
import { logoutAction } from "@/lib/actions/auth";

interface AccountSidebarProps {
  ordersCount: number;
}

export default function AccountSidebar({ ordersCount }: AccountSidebarProps) {
  void ordersCount;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const res = await logoutAction();
      if (res && res.error) {
        setLogoutError(res.error);
        return;
      }
      window.location.href = "/";
    } catch {
      setLogoutError("Logout could not be confirmed. Please retry.");
    } finally {
      setLoggingOut(false);
    }
  };

  const menuItems = [
    {
      group: "My Account",
      items: [
        { id: "profile", icon: AnimatedUser, label: "Personal Information", href: "/account" },
        { id: "addresses", icon: AnimatedMapPin, label: "Manage Addresses", href: "/account?tab=addresses" },
        { id: "forgot", icon: ShieldCheck, label: "Reset Password", href: "/auth?mode=forgot" },
      ],
    },
    {
      group: "My Activity",
      items: [
        { id: "orders", icon: AnimatedShoppingBag, label: "My Orders", href: "/orders",  },
        { id: "wishlist", icon: AnimatedHeart, label: "My Wishlist", href: "/wishlist" },
      
      ],
    },
  ];

  const isActive = (href: string) => {
    // If href has query params, we need to check if they match
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      if (pathname !== path) return false;
      const params = new URLSearchParams(query);
      
      // Special case for tab parameter
      const targetTab = params.get("tab");
      const currentTab = searchParams.get("tab") || "profile";
      return targetTab === currentTab;
    }
    
    if (href === "/account") {
      // If we are at /account without tab param, or with tab=profile
      if (pathname !== "/account") return false;
      const currentTab = searchParams.get("tab") || "profile";
      return currentTab === "profile";
    }
    
    return pathname.startsWith(href);
  };

  return (
    <aside className="lg:w-64 flex-shrink-0 space-y-3">
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
      >
        {menuItems.map((group, gIdx) => (
          <div key={gIdx}>
            <div
              className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}
            >
              {group.group}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-all text-left group"
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    background: active ? "rgba(184,146,74,0.07)" : "transparent",
                    borderLeft: active ? "3px solid var(--color-gold)" : "3px solid transparent",
                    color: active ? "var(--color-gold-dark)" : "var(--color-text-secondary)",
                  }}
                >
                  <item.icon size={16} className="flex-shrink-0" />
                  <span className={`flex-1 ${active ? "font-bold" : ""}`}>{item.label}</span>
                 
                  <AnimatedChevronRight size={14} className={active ? "" : "opacity-50"} style={{ color: "var(--color-border-dark)" }} />
                </Link>
              );
            })}
          </div>
        ))}

        {/* Sign Out */}
        {logoutError && (
          <p role="alert" className="px-5 py-1 text-xs text-red-500 font-medium">{logoutError}</p>
        )}
        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-all cursor-pointer"
          style={{ color: "var(--color-sale)" }}
        >
          <AnimatedLogOut size={16} className="flex-shrink-0" />
          <span className="flex-1 text-left">{loggingOut ? "Signing Out…" : "Sign Out"}</span>
        </button>
      </div>
    </aside>
  );
}
