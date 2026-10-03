import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import OrderDetailsComponent from "@/components/orders/[id]/page";
import { getCustomer, getCustomerOrder } from "@/lib/catalog";

export const dynamic = "force-dynamic";

interface OrderPageProps { params: Promise<{ id: string }>; }

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { id } = await params;
  const token = (await cookies()).get("customerAccessToken")?.value;
  if (!token) redirect(`/auth?returnUrl=/orders/${encodeURIComponent(id)}`);
  const [customer, order] = await Promise.all([
    getCustomer(token),
    getCustomerOrder(token, decodeURIComponent(id)),
  ]);
  if (!customer) redirect(`/auth?returnUrl=/orders/${encodeURIComponent(id)}`);
  if (!order) notFound();
  return <OrderDetailsComponent order={{ ...order, email: customer.email }} isGuest={false} />;
}
