'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import ResponsiveSidebar from '@/components/ResponsiveSidebar';
import Navbar from '@/components/Navbar';
import { ShieldAlert } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    if (isHydrated && !user) {
      router.push('/login');
    }
  }, [isHydrated, user, router]);

  if (!isHydrated) {
    return <div className="min-h-screen bg-background"></div>;
  }

  if (!user) {
    return null;
  }

  // Active Role Guard Check
  let hasAccess = false;
  if (pathname === '/' || pathname.startsWith('/products') || pathname.startsWith('/csv-editor') || pathname.startsWith('/orders') || pathname.startsWith('/collections')) {
    hasAccess = user.roles.some(r => ['Super Admin', 'Admin', 'E-commerce Executive', 'Content Manager'].includes(r));
  } else if (pathname.startsWith('/reports') || pathname.startsWith('/analytics')) {
    hasAccess = user.roles.some(r => ['Super Admin', 'Admin', 'E-commerce Executive'].includes(r));
  } else if (pathname.startsWith('/cms')) {
    hasAccess = user.roles.some(r => ['Super Admin', 'Admin', 'Content Manager'].includes(r));
  } else if (pathname.startsWith('/settings/staff')) {
    hasAccess = user.roles.includes('Super Admin');
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    const defaultHome = user.roles.includes('Content Manager') ? '/cms' : '/';
    return (
      <div className="flex flex-col md:flex-row text-foreground min-h-screen">
        <ResponsiveSidebar />
        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <Navbar />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-card neu-extruded p-8 rounded-3xl border border-border/10 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl neu-inset-sm flex items-center justify-center text-red-500">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
              <p className="text-sm text-muted-foreground">
                Your merchant account role does not have permissions to access this page.
              </p>
              <button 
                onClick={() => router.push(defaultHome)}
                className="mt-2 px-6 py-2.5 neu-btn-primary font-bold rounded-2xl transition duration-200 cursor-pointer text-sm"
              >
                Go Back Home
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row bg-background text-foreground min-h-screen">
      <ResponsiveSidebar />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        <Navbar />
        <main className="flex-1 px-4 md:px-8 pb-12 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

