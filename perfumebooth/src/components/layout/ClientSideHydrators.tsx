"use client";

import dynamic from "next/dynamic";

const ClientOverlays = dynamic(() => import("@/components/layout/ClientOverlays"), { ssr: false });
const WishlistHydrator = dynamic(() => import("@/components/wishlist/WishlistHydrator"), { ssr: false });
const CartHydrator = dynamic(() => import("@/components/cart/CartHydrator"), { ssr: false });
const NewsletterHydrator = dynamic(() => import("@/components/layout/NewsletterHydrator"), { ssr: false });

export default function ClientSideHydrators() {
  return (
    <>
      <ClientOverlays />
      <WishlistHydrator />
      <CartHydrator />
      <NewsletterHydrator />
    </>
  );
}
