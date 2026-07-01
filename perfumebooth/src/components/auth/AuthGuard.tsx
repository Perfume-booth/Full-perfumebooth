"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: "redirect" | "render-fallback";
}

/**
 * AuthGuard intercepts interactions that require authentication.
 * It uses the 'isLoggedIn' cookie (non-httpOnly) for UI-side checks.
 */
export default function AuthGuard({ children, fallback, mode = "redirect" }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Use the non-httpOnly cookie 'isLoggedIn' for immediate UI feedback.
  // The actual server-side security is handled by the http-only 'customerAccessToken'.
  const isLoggedIn = Cookies.get("isLoggedIn") === "true";

  const handleIntercept = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/auth?mode=signin&returnUrl=${encodeURIComponent(pathname)}`);
    }
  };

  if (!isLoggedIn && mode === "render-fallback") {
    return <>{fallback}</>;
  }

  return (
    <div onClickCapture={handleIntercept} className="contents">
      {children}
    </div>
  );
}
