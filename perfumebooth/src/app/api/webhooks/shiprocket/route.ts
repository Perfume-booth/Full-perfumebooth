import { NextRequest, NextResponse } from "next/server";
import { shopifyAdminFetch } from "@/lib/shopify/admin-fetcher";
import crypto from 'crypto';

/**
 * Shiprocket Webhook Listener
 * Receives real-time tracking updates and syncs them with Shopify Metafields.
 */

export async function POST(req: NextRequest) {
  try {
    // 1. Security Check: Verify custom header secret
    const apiKey = req.headers.get("x-api-key");
    const secretKey = process.env.SHIPROCKET_WEBHOOK_SECRET;

    let isAuthorized = false;
    if (apiKey && secretKey) {
      try {
        const keyBuffer = Buffer.from(apiKey);
        const secretBuffer = Buffer.from(secretKey);
        if (keyBuffer.length === secretBuffer.length && crypto.timingSafeEqual(keyBuffer, secretBuffer)) {
          isAuthorized = true;
        }
      } catch (e) {
        // Ignored
      }
    }

    if (!isAuthorized) {
      console.warn("[Webhook] Unauthorized attempt on Shiprocket listener.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Payload
    const body = await req.json();

    // Shiprocket payload structure for tracking updates
    const {
      awb,
      current_status,
      pickup_date,
      order_id
    } = body;

    if (!awb) {
      return NextResponse.json({ error: "Missing AWB tracking number" }, { status: 400 });
    }

    if (!current_status || typeof current_status !== 'string') {
      return NextResponse.json({ error: "Missing current_status" }, { status: 400 });
    }

    console.log(`[Webhook] Received update for AWB: ${awb}, Status: ${current_status}`);

    // 3. Sync tracking status with Shopify
    await updateOrderStatus({
      trackingNumber: awb,
      status: current_status,
      pickupDate: pickup_date,
      orderId: order_id
    });

    // 4. Success Response
    return NextResponse.json({
      success: true,
      message: "Webhook received and processed"
    }, { status: 200 });

  } catch (error) {
    console.error("[Webhook] Internal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Helper function to sync tracking status with Shopify Admin API
 */
async function updateOrderStatus(data: {
  trackingNumber: string;
  status: string;
  pickupDate?: string;
  orderId?: string;
}) {
  try {
    // 1. Map Shiprocket Status
    const status = data.status.toUpperCase();

    const shopifyQuery = `
      query getOrder($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;

    // Try finding order by tracking number
    const { body: searchBody } = await shopifyAdminFetch<any>({
      query: shopifyQuery,
      variables: { query: `tracking_number:${data.trackingNumber}` }
    });

    const orderId = searchBody.data?.orders?.edges?.[0]?.node?.id;

    if (!orderId) {
      console.warn(`[Webhook] Could not find order for tracking number: ${data.trackingNumber}`);
      return;
    }

    // 2. Update Order Metafield with Current Status
    const updateMutation = `
      mutation updateOrderMetafields($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const { body: updateBody } = await shopifyAdminFetch<any>({
      query: updateMutation,
      variables: {
        input: {
          id: orderId,
          metafields: [
            {
              namespace: "custom",
              key: "tracking_status",
              value: status,
              type: "single_line_text_field"
            },
            {
              namespace: "custom",
              key: "last_tracking_update",
              value: new Date().toISOString(),
              type: "date_time"
            }
          ]
        }
      }
    });

    const userErrors = updateBody.data?.orderUpdate?.userErrors;
    if (userErrors && userErrors.length > 0) {
      throw new Error(`Shopify User Errors: ${JSON.stringify(userErrors)}`);
    }

    console.log(`[Webhook] Successfully updated order ${orderId} with status ${status}`);

  } catch (error) {
    console.error("[Webhook] Error in updateOrderStatus:", error);
    throw error; // Re-throw to trigger 500 error for webhook retry
  }
}
