'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { User, Bell, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return <div className="h-16 border-b border-border mb-6"></div>;

  return (
    <header className="h-16 bg-card neu-extruded-sm border-b border-border/20 flex items-center justify-between px-8 mb-6 sticky top-0 z-10 transition-all duration-300">
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Welcome back,</h2>
        <h3 className="font-semibold text-foreground text-sm">{user.fullName || 'Admin Merchant'}</h3>
      </div>

      <div className="flex items-center gap-5">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full neu-btn flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-200"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <button 
          className="w-10 h-10 rounded-full neu-btn flex items-center justify-center text-muted-foreground hover:text-foreground relative cursor-pointer transition-all duration-200"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_rgba(124,58,237,0.9)]"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border/40">
          <div className="flex flex-col items-end">
            <span className="text-xs text-primary neu-inset-sm px-2.5 py-0.5 rounded-full font-medium">
              {user.roles?.[0] || 'Administrator'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full neu-extruded-sm flex items-center justify-center border border-primary/20 text-primary">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
