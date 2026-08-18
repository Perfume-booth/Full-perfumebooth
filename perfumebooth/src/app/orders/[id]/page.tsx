import { cookies } from "next/headers";
import { getCustomer } from "@/lib/shopify";
import { redirect, notFound } from "next/navigation";
import { trackShiprocketOrder } from "@/lib/actions/actions";
import OrderDetailsComponent from "@/components/orders/[id]/page";

export const dynamic = "force-dynamic";

interface OrderPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function OrderDetailPage({ params, searchParams }: OrderPageProps) {
  const { id } = await params;
  const { email } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("customerAccessToken")?.value;

  let order: any = null;
  let trackingInfo: any = null;
  let customerEmail = "";

  // 1. If email is provided in query params, attempt guest login bypass
  if (email) {
    const { getGuestOrderAction } = await import("@/lib/actions/actions");
    const guestResponse: any = await getGuestOrderAction(id, email);
    if (guestResponse.success && guestResponse.order) {
      order = guestResponse.order;
      customerEmail = email;
    } else {
      const errorMsg = guestResponse.error || "Order not found or email mismatch";
      redirect(`/track-order?error=${encodeURIComponent(errorMsg)}&orderId=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`);
    }
  }

  // 2. If guest check didn't load the order, enforce standard customer authentication
  if (!order) {
    if (!token) {
      redirect(`/auth?returnUrl=/orders/${id}`);
    }

    const customer = await getCustomer(token, "no-store");
    if (!customer) {
      redirect(`/auth?returnUrl=/orders/${id}`);
    }

    customerEmail = customer.email;
    const storefrontOrders = customer.orders?.edges.map((e: any) => e.node) || [];

    // Decode the ID and handle both #1001 and 1001 formats
    const orderName = decodeURIComponent(id);
    const { getAdminOrderAction, getAdminOrderByIdAction } = await import("@/lib/actions/actions");

    const sfOrder = storefrontOrders.find((o: any) =>
      o.name === (orderName.startsWith("#") ? orderName : `#${orderName}`) ||
      o.name === orderName ||
      o.id.split("/").pop() === orderName
    );

    let adminOrder = null;
    if (sfOrder?.id) {
      const adminResponse: any = await getAdminOrderByIdAction(sfOrder.id);
      if (adminResponse.success) {
        adminOrder = adminResponse.order;
      }
    }

    // Fallback to name-based search if sfOrder wasn't found or ID fetch failed
    if (!adminOrder) {
      const adminResponse: any = await getAdminOrderAction(orderName.startsWith("#") ? orderName : `#${orderName}`);
      if (adminResponse.success) {
        adminOrder = adminResponse.order;
      }
    }

    if (!sfOrder && !adminOrder) {
      notFound();
    }

    // Combine data
    order = {
      ...sfOrder,
      ...adminOrder,
      cancelledAt: adminOrder?.cancelledAt || sfOrder?.cancelledAt,
      fulfillmentStatus: adminOrder?.fulfillmentStatus || sfOrder?.fulfillmentStatus,
      financialStatus: adminOrder?.financialStatus || sfOrder?.financialStatus,
      displayFulfillmentStatus: adminOrder?.fulfillmentStatus || sfOrder?.fulfillmentStatus,
      displayFinancialStatus: adminOrder?.financialStatus || sfOrder?.financialStatus,
      metafields: adminOrder?.metafields || sfOrder?.metafields || [],
      totalShipping: adminOrder?.totalShipping || sfOrder?.totalShippingPrice?.amount || "0",
      customer: {
        ...sfOrder?.customer,
        id: adminOrder?.customer?.id || sfOrder?.customer?.id
      }
    };
  }

  const orderWithEmail = { ...order, email: customerEmail };

  // Fetch real-time tracking data from Shiprocket
  try {
    const trackingRes: any = await trackShiprocketOrder(order.name, customerEmail);
    if (trackingRes.success) {
      trackingInfo = {
        data: trackingRes.data,
        pickupDate: trackingRes.pickupDate,
        expectedDeliveryDate: trackingRes.expectedDeliveryDate,
        status: trackingRes.status,
        awb: trackingRes.awb,
        courierName: trackingRes.courierName
      };
      // Enrich order with real-time data
      Object.assign(orderWithEmail, {
        fulfillmentStatus: trackingRes.fulfillmentStatus || orderWithEmail.fulfillmentStatus,
        financialStatus: trackingRes.financialStatus || orderWithEmail.financialStatus,
      });
    }
  } catch (error) {
    console.error("Tracking error:", error);
  }

  return (
    <OrderDetailsComponent
      order={orderWithEmail}
      trackingInfo={trackingInfo}
      isGuest={!!email}
    />
  );
}
