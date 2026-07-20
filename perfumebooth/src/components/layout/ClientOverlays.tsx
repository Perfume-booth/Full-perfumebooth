"use client";

import dynamic from "next/dynamic";
import CompareBar from "@/components/product/CompareBar";

const CompareModal = dynamic(() => import("@/components/product/CompareModal"), { ssr: false });
const WhatsAppCTA = dynamic(() => import("@/components/layout/WhatsAppCTA"), { ssr: false });
const FloatingReviews = dynamic(() => import("@/components/layout/FloatingReviews"), { ssr: false });

export default function ClientOverlays() {
  return (
    <>
      <CompareBar />
      <CompareModal />
      <WhatsAppCTA />
      <FloatingReviews />
    </>
  );
}
