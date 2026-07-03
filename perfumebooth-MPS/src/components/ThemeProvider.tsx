'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store/useThemeStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mounted]);

  // Render children normally, the script in head will handle the initial CSS class to avoid flash.
  return <>{children}</>;
}
