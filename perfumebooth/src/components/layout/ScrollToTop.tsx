"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Force instant scroll to top on route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto"
    });
    
    // Backup for different scroll containers
    document.documentElement.scrollTo({ top: 0, behavior: "auto" });
    document.body.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
