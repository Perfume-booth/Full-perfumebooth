/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatedShoppingBag } from "@/components/ui/icons/AnimatedShoppingBag";
import { AnimatedX } from "@/components/ui/icons/AnimatedX";
import { AnimatedChevronDown } from "@/components/ui/icons/AnimatedChevronDown";
import { AnimatedMenu } from "@/components/ui/icons/AnimatedMenu";
import { AnimatedHeart } from "@/components/ui/icons/AnimatedHeart";
import { AnimatedUser as User } from "@/components/ui/icons/AnimatedUser";
import { AnimatedPackage as Package } from "@/components/ui/icons/AnimatedPackage";
import { AnimatedMapPin as MapPin } from "@/components/ui/icons/AnimatedMapPin";
import { AnimatedHelpCircle as HelpCircle } from "@/components/ui/icons/AnimatedHelpCircle";
import { AnimatedLogOut as LogOut } from "@/components/ui/icons/AnimatedLogOut";
import { AnimatedChevronRight as ChevronRight } from "@/components/ui/icons/AnimatedChevronRight";
import { AnimatedArrowLeft } from "@/components/ui/icons/AnimatedArrowLeft";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/useCartStore";
import { useWishlist } from "@/store/useWishlist";
import { NAV_LINKS, BRAND_SUB_MENU } from "@/lib/constants";
import { cn } from "@/lib/utils";
import PerfumeLogo from "@/components/ui/Logo";
import { usePathname } from "next/navigation";
import SearchBar from "@/components/search/SearchBar";
import AccountDropdown from "@/components/layout/account-dropdown";
import CartDropdown from "@/components/layout/CartDropdown";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { logoutAction } from "@/lib/actions/auth";
import Cookies from "js-cookie";
import DeliverTo from "@/components/layout/DeliverTo";
import { safeStorage } from "@/lib/storage";
import { useNewsletterStore } from "@/store/useNewsletterStore";

const GOLD = "#b8924a";
const GOLD_LIGHT = "#d4a96a";
const DARK = "#1a1410";
const MUTED = "#807667";
const CREAM = "#faf7f2";
const BORDER = "#ede8e0";
const ROW2_BG = "#faf8f5";

export default function Navbar({ initialBrands = [] }: { initialBrands?: string[] }) {
  const [isMounted, setIsMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollY = useScrollPosition();
  const isScrolled = scrollY > 10;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();
  const [brands, setBrands] = useState<string[]>(initialBrands);

  useEffect(() => {
    fetch("/api/shop/brands/")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBrands(data);
        }
      })
      .catch(err => console.error("Error fetching brands in Navbar:", err));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoggedIn(Cookies.get("isLoggedIn") === "true");
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }
  function handleMouseEnter(menu: string) {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setActiveDropdown(menu);
  }
  function handleMouseLeave() {
    closeTimeoutRef.current = setTimeout(() => setActiveDropdown(null), 280);
  }

  const brandSubMenu = brands.length > 0
    ? brands.map(brand => ({
        label: brand,
        href: `/${brand.toLowerCase().replace(/\s+/g, '-')}`
      }))
    : BRAND_SUB_MENU;

  const brandGroups = brandSubMenu.reduce((acc: any, brand) => {
    const c = brand.label[0]?.toUpperCase() || '#';
    if (!acc[c]) acc[c] = [];
    acc[c].push(brand);
    return acc;
  }, {});

  const toggleCart = useCartStore((s) => s.toggleCart);
  const cartCount = useCartStore((s) => s.items.reduce((acc, item) => acc + item.cartQuantity, 0));
  const wishlistCount = useWishlist((s) => s.items.length);

  const accountLinks = [
    { id: "profile", icon: User, label: "My Profile", href: "/account" },
    { id: "orders", icon: Package, label: "My Orders", href: "/orders" },
    { id: "addresses", icon: MapPin, label: "Addresses", href: "/account?tab=addresses" },
    { id: "wishlist", icon: AnimatedHeart, label: "Wishlist", href: "/wishlist" },
    { id: "help", icon: HelpCircle, label: "Help & Support", href: "/help" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-shadow duration-300",
        isScrolled && "shadow-[0_2px_24px_rgba(26,20,16,0.09)]"
      )}
    >
      {/* ── Gold top rule ── */}
      <div className="w-full" style={{ background: `linear-gradient(90deg,transparent,${GOLD} 30%,${GOLD_LIGHT} 70%,transparent)` }} />

      {/* ══════════════════════════════════════════════════════════
          DESKTOP — ROW 1: Logo · Nav · [spacer] · Deliver To
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block" style={{ background: ROW2_BG }}>
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="flex items-center h-[60px] gap-0">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 transition-opacity hover:opacity-80 pr-6 mr-1">
              <PerfumeLogo />
            </Link>

            {/* Nav links */}
            <nav className="flex items-center h-full pl-5 gap-0 flex-1">
              {NAV_LINKS.map((link) => {
                const isBrands = link.label === "BRANDS";
                return (
                  <div
                    key={link.href}
                    className="h-full relative group/nav"
                    onMouseEnter={() => isBrands && handleMouseEnter("brands")}
                    onMouseLeave={() => isBrands && handleMouseLeave()}
                  >
                    <Link
                      href={link.href}
                      onClick={(e) => isBrands && e.preventDefault()}
                      className="relative h-full inline-flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] uppercase px-4 transition-colors duration-200"
                      style={{
                        color: (isActive(link.href) && !isBrands) || (isBrands && activeDropdown === "brands") ? GOLD : `${DARK}99`,
                      }}
                    >
                      {link.label}
                      {isBrands && (
                        <AnimatedChevronDown size={11} className={cn("transition-transform duration-200", activeDropdown === "brands" && "rotate-180")} />
                      )}
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[2px] transition-transform duration-200 origin-center"
                        style={{
                          background: GOLD,
                          transform:
                            (isActive(link.href) && !isBrands) || (isBrands && activeDropdown === "brands")
                              ? "scaleX(1)"
                              : "scaleX(0)",
                        }}
                      />
                    </Link>

                    {/* Brands Mega Menu */}
                    {isBrands && (
                      <AnimatePresence>
                        {activeDropdown === "brands" && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="fixed left-0 right-0 z-[1000]"
                            style={{ top: "calc(60px + 52px + 2px)", boxShadow: "0 24px 56px rgba(26,20,16,0.12)" }}
                            onMouseEnter={() => handleMouseEnter("brands")}
                            onMouseLeave={handleMouseLeave}
                          >
                            <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg,transparent,${GOLD},transparent)` }} />
                            <div className="bg-[#fdfcfb] px-10 py-8">
                              <div className="max-w-[1280px] mx-auto">
                                <div className="flex items-center gap-4 mb-6">
                                  <p className="text-[9px] tracking-[0.4em] uppercase font-black" style={{ color: GOLD }}>Brand Explorer</p>
                                  <span className="flex-1 h-px bg-gradient-to-r from-[#e8ddd0] to-transparent" />
                                </div>
                                <div className="grid grid-cols-6 gap-x-8 gap-y-5">
                                  {Object.entries(brandGroups).map(([char, brands]: any) => (
                                    <div key={char}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[18px] font-serif font-bold leading-none select-none" style={{ color: "#ede6dc" }}>{char}</span>
                                        <span className="flex-1 h-px bg-[#ede6dc]" />
                                      </div>
                                      {brands.map((b: any) => (
                                        <Link
                                          key={b.href}
                                          href={b.href}
                                          className="flex items-center gap-1.5 text-[11px] font-semibold py-0.5 transition-colors"
                                          style={{ color: "#4a3f35" }}
                                          onMouseEnter={(e) => (e.currentTarget.style.color = GOLD)}
                                          onMouseLeave={(e) => (e.currentTarget.style.color = "#4a3f35")}
                                        >
                                          <span className="w-1 h-1 rounded-full bg-[#d4bfa0] flex-shrink-0" />
                                          {b.label}
                                        </Link>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Deliver To — right-aligned */}
            {isMounted && isLoggedIn && <DeliverTo />}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            DESKTOP — ROW 2: Search (center) · Icons (right)
        ══════════════════════════════════════════════════════ */}
        <div style={{ background: ROW2_BG }}>
          {/* Relative wrapper so absolute-center search works against the full row width */}
          <div className="relative h-[52px] max-w-[1440px] mx-auto px-6 lg:px-10 flex items-center">

            {/* ── Truly centered search (absolute) ── */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full max-w-[580px] px-6 pointer-events-auto">
                <SearchBar variant="desktop" />
              </div>
            </div>

            {/* ── Invisible left spacer ── */}
            <div className="flex-1" />

            {/* ── Icon tray (right) ── */}
            <div className="relative z-10 flex items-center gap-1 flex-shrink-0">
              {isMounted && isLoggedIn && (
                <NavIconBtn label="Wishlist" href="/wishlist" badge={wishlistCount}>
                  <AnimatedHeart size={20} strokeWidth={1.75} />
                </NavIconBtn>
              )}

              {isMounted && (
                <CartDropdown
                  href="/cart"
                  trigger={(isOpen) => (
                    <NavIconBtn label="Cart" badge={cartCount} className={isOpen ? "bg-white shadow-sm" : ""}>
                      <AnimatedShoppingBag size={20} strokeWidth={1.75} animateOn={isOpen ? "view" : "hover"} />
                    </NavIconBtn>
                  )}
                />
              )}

              {isMounted && isLoggedIn ? (
                <AccountDropdown
                  trigger={(isOpen) => (
                    <NavIconBtn label="Account" className={isOpen ? "bg-white shadow-sm" : ""}>
                      <div className="relative">
                        <User size={20} strokeWidth={1.75} animateOn={isOpen ? "view" : "hover"} />
                        <span
                          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ring-1 ring-white"
                          style={{ background: "#10b981" }} // success color
                        />
                      </div>
                    </NavIconBtn>
                  )}
                />
              ) : (
                isMounted && (
                  <Link href="/auth?mode=signin">
                    <button
                      className="h-8 px-4 rounded-full text-[10px] font-bold uppercase tracking-wider hover:text-white hover:bg-[#b8924a] transition-all duration-300 flex items-center justify-center shadow-sm ml-2"
                     
                    >
                      Sign In
                    </button>
                  </Link>
                )
              )}
            </div>
          </div>
        </div>

        {/* Bottom shadow line */}
        <div className="h-px w-full" style={{ background: BORDER }} />
      </div>

      {/* ══════════════════════════════════════════════════════════
          MOBILE — single bar + drawer
      ══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden bg-white" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between h-14 px-3">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-1">
            {pathname !== "/" && !pathname.startsWith("/checkout") && (
              <button 
                onClick={() => window.history.back()} 
                className="p-2 -ml-1 rounded-full hover:bg-[#f6f3ee] transition-colors flex items-center justify-center animate-fadeIn" 
                aria-label="Go back"
                suppressHydrationWarning={true}
              >
                <AnimatedArrowLeft size={22} style={{ color: DARK }} />
              </button>
            )}
            <button 
              onClick={() => setMobileOpen(true)} 
              className={cn("p-2 rounded-full hover:bg-[#f6f3ee] transition-colors", (pathname === "/" || pathname.startsWith("/checkout")) ? "-ml-1" : "-ml-2")} 
              aria-label="Open menu"
              suppressHydrationWarning={true}
            >
              <AnimatedMenu size={22} style={{ color: DARK }} />
            </button>
            <Link href="/" className="scale-75 origin-left">
              <PerfumeLogo />
            </Link>
          </div>
          {/* Right: icons */}
          <div className="flex items-center">
            <SearchBar variant="mobile" />
            {isMounted && (
              <>
                {isLoggedIn && <MobileIconBtn href="/wishlist" label="Wishlist" badge={wishlistCount}><AnimatedHeart size={20} strokeWidth={2} /></MobileIconBtn>}
                <MobileIconBtn href="/cart" label="Cart" badge={cartCount}><AnimatedShoppingBag size={20} strokeWidth={2} /></MobileIconBtn>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220, mass: 0.8 }}
              className="absolute left-0 top-0 bottom-0 w-[300px] bg-white shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-[2px] rounded-full" style={{ background: GOLD }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: DARK }}>Menu</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-full hover:bg-[#f6f3ee]">
                  <AnimatedX size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Account section */}
                <div className="px-4 pt-5 pb-4" style={{ background: CREAM, borderBottom: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow" style={{ background: `linear-gradient(135deg,${GOLD_LIGHT},${GOLD})` }}>
                      <User size={20} className="text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold leading-tight" style={{ color: DARK, fontFamily: "var(--font-serif)" }}>
                        {isMounted && isLoggedIn ? "Welcome back" : "Hello, Guest"}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                        {isMounted && isLoggedIn ? "Manage your account" : "Sign in for the best experience"}
                      </p>
                    </div>
                  </div>
                  {isMounted && !isLoggedIn && (
                    <div className="flex gap-2">
                      <Link href={`/auth?mode=signin&returnUrl=${encodeURIComponent(pathname)}`} onClick={() => setMobileOpen(false)} className="flex-1 text-center text-[11px] font-bold py-2 rounded-lg uppercase tracking-wider text-white" style={{ border: `1.5px solid ${GOLD}`, color: GOLD }}>Sign In</Link>
                      <Link href={`/auth?mode=signup&returnUrl=${encodeURIComponent(pathname)}`} onClick={() => setMobileOpen(false)} className="flex-1 text-center text-[11px] font-bold py-2 rounded-lg uppercase tracking-wider" style={{ border: `1.5px solid ${GOLD}`, color: GOLD }}>Register</Link>
                    </div>
                  )}
                </div>

                {/* Shop nav */}
                <div className="px-2 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <SectionLabel>Shop</SectionLabel>
                  {NAV_LINKS.map((link) => {
                    const isBrands = link.label === "BRANDS";
                    return (
                      <div key={link.href}>
                        <DrawerLink
                          href={link.href}
                          active={isActive(link.href) && !isBrands}
                          onClick={(e) => {
                            if (isBrands) { e.preventDefault(); setActiveDropdown(activeDropdown === "mobile-brands" ? null : "mobile-brands"); }
                            else setMobileOpen(false);
                          }}
                          trailingIcon={<ChevronRight size={13} className={cn("transition-transform duration-200", isBrands && activeDropdown === "mobile-brands" && "rotate-90")} />}
                        >
                          {link.label}
                        </DrawerLink>
                        {isBrands && activeDropdown === "mobile-brands" && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden rounded-lg ml-4 mt-1 mb-1" style={{ background: CREAM }}>
                            <div className="py-2 px-3 columns-2 gap-2">
                              {brandSubMenu.map((brand) => (
                                <Link key={brand.href} href={brand.href} onClick={() => setMobileOpen(false)} className="block text-[11px] font-medium py-1 break-inside-avoid transition-colors" style={{ color: MUTED }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = GOLD)}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}>
                                  {brand.label}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Account links */}
                {isMounted && isLoggedIn && (
                  <div className="px-2 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <SectionLabel>My Account</SectionLabel>
                    {accountLinks.map(({ id, icon: Icon, label, href }) => (
                      <DrawerLink key={id} href={href} icon={<Icon size={15} />} onClick={() => setMobileOpen(false)} active={pathname === href || (href === "/account" && id === "profile" && pathname.startsWith("/account"))}>
                        {label}
                      </DrawerLink>
                    ))}
                  </div>
                )}



                {/* Sign out */}
                {isMounted && isLoggedIn && (
                  <div className="px-4 py-3">
                    <button onClick={async () => {
                      setMobileOpen(false);
                      await logoutAction();
                      useWishlist.getState().clearWishlist();
                      useNewsletterStore.getState().reset();
                      window.location.href = "/";
                    }} className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-red-50 transition-colors">
                      <LogOut size={15} className="text-red-400 flex-shrink-0" />
                      <span className="text-[13px] text-red-400 font-medium">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ─── Sub-components ────────────────────────────────────────── */

function NavIconBtn({ href, label, badge = 0, children, className }: { href?: string; label: string; badge?: number; children: React.ReactNode; className?: string }) {
  const inner = (
    <div className={cn("relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] rounded-xl hover:bg-white transition-colors group/icon cursor-pointer", className)}>
      <div className="relative text-[#4e4638] group-hover/icon:text-[#1a1410] transition-colors">
        {children}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-black text-white px-0.5 border-2 border-white" style={{ background: GOLD }}>
            {badge}
          </span>
        )}
      </div>
      <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#807667] group-hover/icon:text-[#1a1410] transition-colors leading-none">{label}</span>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return <div>{inner}</div>;
}

function MobileIconBtn({ href, label, badge = 0, children }: { href: string; label: string; badge?: number; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={label} className="relative p-2 text-[#4e4638] rounded-full transition-colors active:bg-[#f6f3ee]">
      {children}
      {badge > 0 && (
        <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[9px] font-black text-white px-0.5 border border-white" style={{ background: GOLD }}>
          {badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] uppercase tracking-[0.28em] font-black px-3 mb-1.5" style={{ color: MUTED }}>{children}</p>;
}

function DrawerLink({ href, icon, children, trailingIcon, active, onClick }: {
  href: string; icon?: React.ReactNode; children: React.ReactNode;
  trailingIcon?: React.ReactNode; active?: boolean; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link href={href} onClick={onClick} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors", active ? "bg-[#fff5e8]" : "hover:bg-[#faf7f2]")}>
      {icon && <span className="flex-shrink-0" style={{ color: active ? GOLD : MUTED }}>{icon}</span>}
      <span className="flex-1 text-[13px] font-medium tracking-tight" style={{ color: active ? DARK : "#4e4638" }}>{children}</span>
      {trailingIcon
        ? <span style={{ color: active ? GOLD : "#d1c5b3" }}>{trailingIcon}</span>
        : <ChevronRight size={12} style={{ color: active ? GOLD : "#d1c5b3" }} />}
    </Link>
  );
}

function MobileDeliverTo() {
  const [location, setLocation] = useState<{ label: string; pincode: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    try { 
      const s = safeStorage.getItem("pb_deliver_to"); 
      if (s) {
        const timer = setTimeout(() => {
          setLocation(JSON.parse(s));
        }, 0);
        return () => clearTimeout(timer);
      }
    } catch { }
  }, []);

  const CITY_MAP: Record<string, string> = {
    "110001": "New Delhi", "400001": "Mumbai", "400050": "Mumbai",
    "700001": "Kolkata", "600001": "Chennai", "560001": "Bangalore",
    "122002": "Gurugram", "201301": "Noida", "380001": "Ahmedabad",
    "411001": "Pune", "500001": "Hyderabad",
  };

  const apply = () => {
    const pin = input.trim();
    if (!/^\d{6}$/.test(pin)) { setErr("Enter a valid 6-digit pincode"); return; }
    const loc = { pincode: pin, label: CITY_MAP[pin] || "Your Area" };
    setLocation(loc);
    safeStorage.setItem("pb_deliver_to", JSON.stringify(loc));
    setEditing(false); setInput(""); setErr("");
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-2" style={{ borderBottom: `1px solid ${BORDER}`, background: "#fdfcfb" }}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setEditing(v => !v)}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,146,74,0.1)" }}>
          <MapPin size={13} style={{ color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: MUTED }}>Deliver to</p>
          <p className="text-[12px] font-bold truncate" style={{ color: DARK }}>
            {location ? `${location.label}${location.pincode ? ` ${location.pincode}` : ""}` : "Select Address"}
          </p>
        </div>
        <AnimatedChevronDown size={13} className={cn("transition-transform duration-200 flex-shrink-0", editing && "rotate-180")} style={{ color: MUTED }} />
      </div>
      {editing && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
          <div className="pt-2 flex gap-2">
            <input type="text" inputMode="numeric" maxLength={6} value={input}
              onChange={(e) => { setInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="Enter pincode"
              className="flex-1 px-3 py-1.5 text-[12px] rounded-lg outline-none"
              style={{ border: `1.5px solid ${err ? "#ba1a1a" : BORDER}`, background: "#fdfcfb", color: DARK }}
            />
            <button onClick={apply} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ background: `linear-gradient(135deg,${GOLD},#d4a96a)` }}>Apply</button>
          </div>
          {err && <p className="text-[9px] mt-1" style={{ color: "#ba1a1a" }}>{err}</p>}
        </motion.div>
      )}
    </div>
  );
}
