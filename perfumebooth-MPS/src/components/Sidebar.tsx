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
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PerfumeLogo from '@/components/Logo';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Products', href: '/products', icon: ShoppingBag, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Inventory', href: '/inventory', icon: Package, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Orders', href: '/orders', icon: FileText, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Customers', href: '/customers', icon: Users, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart2, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Reports', href: '/reports', icon: FileSpreadsheet, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Marketing', href: '/marketing', icon: Megaphone, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'Coupons', href: '/coupons', icon: Ticket, allowedRoles: ['Super Admin', 'Admin', 'E-commerce Executive'] },
    { name: 'CMS Builder', href: '/cms', icon: Sliders, allowedRoles: ['Super Admin', 'Admin', 'Content Manager'] },
    { name: 'Staff Settings', href: '/settings/staff', icon: Shield, allowedRoles: ['Super Admin'] },
  ];

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!mounted || !user) {
    return <aside className="w-64 glass-panel border-r border-border min-h-screen"></aside>;
  }

  // Filter items by user role
  const visibleItems = menuItems.filter(item => 
    user.roles.some(r => item.allowedRoles.includes(r))
  );

  return (
    <aside className="w-64 glass-panel border-r border-border min-h-screen flex flex-col justify-between p-6">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-start h-10 w-full text-foreground">
          <PerfumeLogo />
        </div>

        <nav className="flex flex-col gap-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all duration-200 mt-auto cursor-pointer"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>
    </aside>
  );
}
