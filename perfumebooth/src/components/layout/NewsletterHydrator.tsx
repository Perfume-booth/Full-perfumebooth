"use client";

import { useEffect } from "react";
import { useNewsletterStore } from "@/store/useNewsletterStore";
import Cookies from "js-cookie";

export default function NewsletterHydrator() {
  const { checkSubscription } = useNewsletterStore();

  useEffect(() => {
    const isLoggedIn = Cookies.get("isLoggedIn") === "true";

    if (isLoggedIn) {
      checkSubscription();
    }
  }, [checkSubscription]);

  return null;
}
