import { cookies } from "next/headers";
import { getCustomer } from "@/lib/shopify";
import { redirect } from "next/navigation";
import OrderHistoryComponent from "@/components/orders/page";
import { getCustomerOrdersAction } from "@/lib/actions/actions";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("customerAccessToken")?.value;

  if (!token) {
    redirect("/auth?returnUrl=/orders");
  }

  const customer = await getCustomer(token, "no-store");

  if (!customer) {
    redirect("/auth?returnUrl=/orders");
  }

  // 1. Get orders from Storefront API (reliable)
  const storefrontOrders = customer.orders?.edges.map((e: { node: any }) => e.node) || [];

  // 2. Try to enrich with Admin API data (for tracking_status metafield)
  let orders = storefrontOrders;
  try {
    const { orders: adminOrders } = await getCustomerOrdersAction();
    if (adminOrders && adminOrders.length > 0) {
      // Merge admin data into storefront orders by name/id
      orders = storefrontOrders.map((sfOrder: {
        financialStatus: any;
        fulfillmentStatus: any; name: any; 
}) => {
        const adminOrder: any = adminOrders.find((ao: any) => ao.name === sfOrder.name);
        if (adminOrder) {
          return {
            ...sfOrder,
            cancelledAt: adminOrder.cancelledAt,
            fulfillmentStatus: adminOrder.fulfillmentStatus || sfOrder.fulfillmentStatus,
            financialStatus: adminOrder.financialStatus || sfOrder.financialStatus,
            metafields: adminOrder.metafields || []
          };
        }
        return sfOrder;
      });
    }
  } catch (err) {
    console.error("Failed to enrich orders with Admin API:", err);
  }

  return <OrderHistoryComponent orders={orders} email={customer.email} />;
}
