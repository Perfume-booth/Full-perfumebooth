"use client";

import dynamic from "next/dynamic";

const ClientOverlays = dynamic(() => import("@/components/layout/ClientOverlays"), { ssr: false });
const WishlistHydrator = dynamic(() => import("@/components/wishlist/WishlistHydrator"), { ssr: false });
const NewsletterHydrator = dynamic(() => import("@/components/layout/NewsletterHydrator"), { ssr: false });

export default function ClientSideHydrators() {
  return (
    <>
      <ClientOverlays />
      <WishlistHydrator />
      <NewsletterHydrator />
    </>
  );
}
