import { Metadata } from "next";
import { requireCustomer } from "@/lib/actions/auth";
import AccountHero from "../AccountHero";
import AccountSidebar from "../AccountSidebar";

export const metadata: Metadata = {
  title: "My Account | Perfume Booth",
  description: "View your recent orders, manage shipping addresses, and update your profile.",
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await requireCustomer();

  const ordersCount = customer.orders?.edges.length || 0;
  const addressesCount = customer.addresses?.edges.length || 0;

  return (
    <main className="min-h-screen md:pt-28 pt-15 pb-16">
      {/* ─── Hero Header ─── */}
      <AccountHero 
        customer={{
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          createdAt: customer.createdAt,
          ordersCount,
          addressesCount,
          gender: (() => {
            if (customer.tags?.includes("gender_men")) return "men";
            if (customer.tags?.includes("gender_women")) return "women";
            if (customer.tags?.includes("gender_others")) return "others";
            return customer.gender?.value || "";
          })(),
        }} 
      />

      {/* ─── Body ─── */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 mt-3 md:mt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <AccountSidebar ordersCount={ordersCount} />
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
