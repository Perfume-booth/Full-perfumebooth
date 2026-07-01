"use client";

import { useEffect } from "react";
import { useWishlist } from "@/store/useWishlist";
import Cookies from "js-cookie";
import { usePathname } from "next/navigation";

export default function WishlistHydrator() {
  const { fetchFromBackend, clearWishlist } = useWishlist();
  const pathname = usePathname();

  useEffect(() => {
    const isLoggedIn = Cookies.get("isLoggedIn") === "true";

    if (isLoggedIn) {
      fetchFromBackend();
    }

  }, [fetchFromBackend, pathname]);

  return null;
}
