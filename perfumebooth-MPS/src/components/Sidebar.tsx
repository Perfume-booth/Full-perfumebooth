'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PerfumeLogo from '@/components/Logo';
import { apiFetch } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Products', href: '/products', icon: ShoppingBag, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Collections', href: '/collections', icon: FolderOpen, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive', 'Content Manager'] },
    { name: 'Inventory', href: '/inventory', icon: Package, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Orders', href: '/orders', icon: FileText, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Customers', href: '/customers', icon: Users, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart2, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Reports', href: '/reports', icon: FileSpreadsheet, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Coupons & Deals', href: '/coupons', icon: Ticket, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'CMS Builder', href: '/cms', icon: Sliders, allowedRoles: ['Super Admin', 'Admin', 'Content Manager'] },
    { name: 'Blog Manager', href: '/cms/blog', icon: BookOpen, allowedRoles: ['Super Admin', 'Admin', 'Content Manager'] },
    { name: 'Staff Settings', href: '/settings/staff', icon: Shield, allowedRoles: ['Super Admin'] },
  ];

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

  // Filter items by user role
  const visibleItems = menuItems.filter(item =>
    user.roles.some(r => item.allowedRoles.includes(r))
  );

  return (
    <aside className="w-64 bg-card neu-extruded border-r border-border/20 h-screen sticky top-0 flex flex-col justify-between p-6 z-20 transition-all duration-300">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-start h-10 w-full text-foreground px-1">
          <PerfumeLogo />
        </div>

        <nav className="flex flex-col gap-2.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/cms'
              ? pathname === '/cms'
              : (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${isActive
                    ? 'neu-inset text-primary font-semibold border border-primary/25 scale-[0.99]'
                    : 'text-muted-foreground hover:neu-extruded-sm hover:text-foreground hover:scale-[1.01]'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span className="text-sm">{item.name}</span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.8)] ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto">
      {logoutError && <p role="alert" className="text-sm text-red-500">{logoutError}</p>}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:neu-inset-sm hover:text-red-600 transition-all duration-200 mt-auto cursor-pointer"
      >
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">{loggingOut ? 'Logging out…' : 'Logout'}</span>
      </button>
      </div>
    </aside>
  );
}
