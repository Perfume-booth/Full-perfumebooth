'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Sliders,
  LogOut,
  Shield,
  Ticket,
  Package,
  BarChart2,
  FileSpreadsheet,
  Users,
  FolderOpen,
  BookOpen,
  Folder,
  Layers,
  ChevronDown,
  ChevronRight,
  Star,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import PerfumeLogo from '@/components/Logo';
import { apiFetch } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  // Expandable state for CMS group
  const [cmsOpen, setCmsOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-expand CMS when user visits /cms or /cms/pages or /cms/media or /cms/inquiries
  useEffect(() => {
    if (pathname.startsWith('/cms') && !pathname.startsWith('/cms/blog')) {
      setCmsOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await apiFetch('/auth/logout/', { method: 'POST' });
      clearAuth();
      router.replace('/login');
      router.refresh();
    } catch {
      setLogoutError('Logout could not be confirmed. Please retry.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (!mounted || !user) {
    return <aside className="w-64 glass-panel border-r border-border h-screen sticky top-0"></aside>;
  }

  // Check role access
  const hasRole = (allowedRoles: string[]) => user.roles.some((r) => allowedRoles.includes(r));

  const standardNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Products', href: '/products', icon: ShoppingBag, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Collections', href: '/collections', icon: FolderOpen, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive', 'Content Manager'] },
    { name: 'Inventory', href: '/inventory', icon: Package, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Orders', href: '/orders', icon: FileText, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Customers', href: '/customers', icon: Users, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Reviews', href: '/reviews', icon: Star, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive', 'Content Manager'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart2, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Reports', href: '/reports', icon: FileSpreadsheet, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Coupons & Deals', href: '/coupons', icon: Ticket, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
  ];

  const hasCmsAccess = hasRole(['Super Admin', 'Admin', 'Content Manager']);
  const hasBlogAccess = hasRole(['Super Admin', 'Admin', 'Content Manager']);
  const hasStaffAccess = hasRole(['Super Admin']);

  // Active check for CMS parent (only active for /cms, /cms/pages, /cms/media, NOT for /cms/blog)
  const isCmsParentActive = pathname.startsWith('/cms') && !pathname.startsWith('/cms/blog');
  const isBlogActive = pathname.startsWith('/cms/blog');

  return (
    <aside className="w-64 bg-card neu-extruded border-r border-border/20 h-screen sticky top-0 flex flex-col justify-between p-4 z-20 transition-all duration-300">
      {/* Top Brand Logo */}
      <div className="flex items-center justify-start h-10 w-full text-foreground px-2 mb-4 shrink-0">
        <PerfumeLogo />
      </div>

      {/* Scrollable Navigation Area */}
      <nav className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-border/40 hover:scrollbar-thumb-primary/30">
        {/* Core Commerce Menu Items */}
        {standardNavItems
          .filter((item) => hasRole(item.allowedRoles))
          .map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'neu-inset text-primary font-semibold border border-primary/25 scale-[0.99]'
                    : 'text-muted-foreground hover:neu-extruded-sm hover:text-foreground hover:scale-[1.01]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                <span className="text-sm font-medium">{item.name}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.8)] ml-auto" />
                )}
              </Link>
            );
          })}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* CMS SECTION (Home, Pages, Media)                             */}
        {/* ──────────────────────────────────────────────────────────── */}
        {hasCmsAccess && (
          <div className="pt-2">
            {/* CMS Group Accordion Header */}
            <button
              type="button"
              onClick={() => setCmsOpen(!cmsOpen)}
              className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                isCmsParentActive
                  ? 'neu-inset text-primary font-bold border border-primary/25 scale-[0.99]'
                  : 'text-muted-foreground hover:neu-extruded-sm hover:text-foreground hover:scale-[1.01]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${isCmsParentActive ? 'text-primary' : ''}`} />
                <span className="text-sm font-semibold tracking-wide">CMS</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isCmsParentActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(124,58,237,0.8)]" />
                )}
                {cmsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                )}
              </div>
            </button>

            {/* CMS Nested Links */}
            {cmsOpen && (
              <div className="flex flex-col gap-1 pl-3 ml-3 border-l-2 border-primary/20 mt-1.5 py-1">
                {/* 1. Home Page CMS */}
                <Link
                  href="/cms"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === '/cms'
                      ? 'neu-inset text-primary font-bold border border-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    <span>Home</span>
                  </div>
                  {pathname === '/cms' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>

                {/* 2. Pages (Store Info & Policies Studio) */}
                <Link
                  href="/cms/pages"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname.startsWith('/cms/pages')
                      ? 'neu-inset text-primary font-bold border border-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Pages</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">
                      8
                    </span>
                    {pathname.startsWith('/cms/pages') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                </Link>

                {/* 3. Inquiries & Leads */}
                <Link
                  href="/cms/inquiries"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === '/cms/inquiries'
                      ? 'neu-inset text-primary font-bold border border-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                    <span>Inquiries</span>
                  </div>
                  {pathname === '/cms/inquiries' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>

                {/* 4. Media Library */}
                <Link
                  href="/cms/media"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === '/cms/media'
                      ? 'neu-inset text-primary font-bold border border-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Media Library</span>
                  </div>
                  {pathname === '/cms/media' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* BLOG MANAGER (Separate Standalone Menu Item in Sidebar)      */}
        {/* ──────────────────────────────────────────────────────────── */}
        {hasBlogAccess && (
          <div className="pt-1">
            <Link
              href="/cms/blog"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-200 ${
                isBlogActive
                  ? 'neu-inset text-primary font-semibold border border-primary/25 scale-[0.99]'
                  : 'text-muted-foreground hover:neu-extruded-sm hover:text-foreground hover:scale-[1.01]'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${isBlogActive ? 'text-primary' : ''}`} />
              <span className="text-sm font-medium">Blog</span>
              {isBlogActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.8)] ml-auto" />
              )}
            </Link>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* STAFF SETTINGS (Super Admin Only)                            */}
        {/* ──────────────────────────────────────────────────────────── */}
        {hasStaffAccess && (
          <div className="pt-1">
            <Link
              href="/settings/staff"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-200 ${
                pathname.startsWith('/settings/staff')
                  ? 'neu-inset text-primary font-semibold border border-primary/25 scale-[0.99]'
                  : 'text-muted-foreground hover:neu-extruded-sm hover:text-foreground hover:scale-[1.01]'
              }`}
            >
              <Shield className={`w-4 h-4 ${pathname.startsWith('/settings/staff') ? 'text-primary' : ''}`} />
              <span className="text-sm font-medium">Staff Settings</span>
              {pathname.startsWith('/settings/staff') && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.8)] ml-auto" />
              )}
            </Link>
          </div>
        )}
      </nav>

      {/* Pinned Bottom Logout Section */}
      <div className="pt-3 mt-2 border-t border-border/20 shrink-0 flex flex-col gap-2">
        {logoutError && <p role="alert" className="text-xs text-red-500 px-2">{logoutError}</p>}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-red-500 hover:neu-inset-sm hover:text-red-600 transition-all duration-200 cursor-pointer w-full"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">{loggingOut ? 'Logging out…' : 'Logout'}</span>
        </button>
      </div>
    </aside>
  );
}
