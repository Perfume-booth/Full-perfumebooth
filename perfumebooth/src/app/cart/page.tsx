import type { Metadata } from "next";
import CartPageClient from "./CartPageClient";

export const metadata: Metadata = {
  title: "My Cart",
  description: "Review your selected fragrances before checkout.",
};

export default function CartPage() {
  return <CartPageClient />;
}
