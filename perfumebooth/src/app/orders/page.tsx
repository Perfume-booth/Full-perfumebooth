import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import OrderHistoryComponent from "@/components/orders/page";
import { getCustomer, getCustomerOrders } from "@/lib/catalog";
import { refreshAccessToken } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const cookieStore = await cookies();
  let token = cookieStore.get("customerAccessToken")?.value;

  if (!token) {
    token = (await refreshAccessToken()) || undefined;
  }

  if (!token) {
    redirect("/auth?returnUrl=/orders");
  }

  let [customer, orders] = await Promise.all([
    getCustomer(token),
    getCustomerOrders(token),
  ]);

  // If customer call failed due to token expiration on backend, try silent refresh once
  if (!customer) {
    token = (await refreshAccessToken()) || undefined;
    if (token) {
      [customer, orders] = await Promise.all([
        getCustomer(token),
        getCustomerOrders(token),
      ]);
    }
  }

  if (!customer) {
    redirect("/auth?returnUrl=/orders");
  }

  return <OrderHistoryComponent orders={orders || []} email={customer.email} />;
}
