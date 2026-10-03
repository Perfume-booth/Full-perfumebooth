import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import OrderHistoryComponent from "@/components/orders/page";
import { getCustomer, getCustomerOrders } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const token = (await cookies()).get("customerAccessToken")?.value;
  if (!token) redirect("/auth?returnUrl=/orders");
  const [customer, orders] = await Promise.all([getCustomer(token), getCustomerOrders(token)]);
  if (!customer) redirect("/auth?returnUrl=/orders");
  return <OrderHistoryComponent orders={orders} email={customer.email} />;
}
