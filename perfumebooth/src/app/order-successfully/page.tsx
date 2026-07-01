"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OrderSuccess from "@/components/checkout/OrderSuccess";
import { trackPurchase } from "@/lib/analytics";

export default function OrderSuccessfullyPage() {
  const router = useRouter();
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = sessionStorage.getItem("pb_last_order");
    if (!data) {
      router.replace("/");
      return;
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.orderId) {
        setOrderInfo(parsed);
        
        // Only trigger GTM/GA4 purchase event if not already tracked in this session
        if (!parsed.tracked) {
          trackPurchase(parsed.orderId, parsed.items || [], parsed.total, parsed.coupon);
          
          // Mark as tracked and update sessionStorage to avoid duplicate hits on refresh
          parsed.tracked = true;
          sessionStorage.setItem("pb_last_order", JSON.stringify(parsed));
        }
      } else {
        router.replace("/");
      }
    } catch (e) {
      console.error(e);
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#b8924a]/20 border-t-[#b8924a] rounded-full animate-spin" />
      </div>
    );
  }

  if (!orderInfo) return null;

  return (
    <OrderSuccess
      orderId={orderInfo.orderId}
      email={orderInfo.email}
      total={orderInfo.total}
      items={orderInfo.items}
    />
  );
}
