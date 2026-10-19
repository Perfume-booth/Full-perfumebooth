import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import OrderDetailsComponent from "@/components/orders/[id]/page";
import { getCustomer, getCustomerOrder, getGuestOrder } from "@/lib/catalog";

export const dynamic = "force-dynamic";

interface OrderPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ email?: string; error?: string }>;
}

export default async function OrderDetailPage({ params, searchParams }: OrderPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const emailParam = resolvedSearchParams.email?.trim();
  const token = (await cookies()).get("customerAccessToken")?.value;

  if (token) {
    const [customer, order] = await Promise.all([
      getCustomer(token),
      getCustomerOrder(token, decodeURIComponent(id)),
    ]);
    if (order && customer) {
      return <OrderDetailsComponent order={{ ...order, email: customer.email }} isGuest={false} />;
    }
  }

  // If no auth token or order not found for logged in user, check if guest tracking email is provided
  if (emailParam) {
    const guestOrder = await getGuestOrder(decodeURIComponent(id), emailParam);
    if (guestOrder) {
      return <OrderDetailsComponent order={{ ...guestOrder, email: emailParam }} isGuest={true} />;
    }
    redirect(
      `/track-order?error=${encodeURIComponent("Could not find order with provided ID and email. Please verify and try again.")}&orderId=${encodeURIComponent(id)}&email=${encodeURIComponent(emailParam)}`
    );
  }

  if (token) {
    notFound();
  }

  redirect(`/auth?returnUrl=/orders/${encodeURIComponent(id)}`);
}
