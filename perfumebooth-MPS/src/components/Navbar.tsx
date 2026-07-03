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
    <header className="h-16 glass-panel border-b border-border flex items-center justify-between px-8 mb-6 sticky top-0 z-10">
      <div>
        <h2 className="text-sm text-muted-foreground">Welcome back,</h2>
        <h3 className="font-semibold text-foreground">{user.fullName || 'Admin Merchant'}</h3>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition duration-200 cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="text-muted-foreground hover:text-foreground relative p-2 rounded-full hover:bg-muted transition duration-200 cursor-pointer">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="flex flex-col items-end">
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
              {user.roles?.[0] || 'Administrator'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 text-primary">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
