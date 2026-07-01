import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCart } from '@/lib/shopify/cart';

// Map to track active order creations to serialize concurrent webhook runs.
const activeCreations = new Map<string, Promise<any>>();

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn("Razorpay Webhook Warning: Missing x-razorpay-signature header.");
      return NextResponse.json({ success: false, message: "Missing signature header" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Verify Webhook Signature if secret is configured
    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      let isValidSignature = false;
      try {
        const expectedBuffer = Buffer.from(expectedSignature);
        const signatureBuffer = Buffer.from(signature);
        if (expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
          isValidSignature = true;
        }
      } catch (e) {
        // Ignored
      }

      if (!isValidSignature) {
        console.error("Razorpay Webhook Error: Cryptographic Webhook Signature Mismatch");
        return NextResponse.json({ success: false, message: "Invalid webhook signature" }, { status: 400 });
      }
    } else {
      console.warn("RAZORPAY_WEBHOOK_SECRET is not set in environment variables. Webhook signature validation skipped in development.");
    }

    // 2. Parse Webhook Event
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // We only process order.paid events to prevent duplicate order injection
    if (event !== 'order.paid') {
      return NextResponse.json({ success: true, message: `Ignored unhandled event: ${event}` });
    }

    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const razorpay_order_id = orderEntity?.id || paymentEntity?.order_id;
    const razorpay_payment_id = paymentEntity?.id;

    if (!razorpay_order_id || !razorpay_payment_id) {
      console.error("Razorpay Webhook Error: Missing payment/order identifiers in payload", { razorpay_order_id, razorpay_payment_id });
      return NextResponse.json({ success: false, message: "Missing payment/order IDs" }, { status: 400 });
    }

    // Await active creation for this order if there is one (prevents concurrent race conditions)
    let activePromise = activeCreations.get(razorpay_order_id);
    if (activePromise) {
      console.log(`Razorpay Webhook: Order ${razorpay_order_id} is already being processed. Waiting for existing run to finish...`);
      try {
        await activePromise;
      } catch (e) {
        // Ignored
      }
    }

    // 3. Extract Shopify Admin Credentials (Dynamic Access Token via ID & Secret)
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!domain || !clientId || !clientSecret) {
      console.error("Missing Shopify Admin API OAuth configuration in Webhook handler.", { domain: !!domain, clientId: !!clientId, clientSecret: !!clientSecret });
      return NextResponse.json({ success: false, message: "Server configuration missing" }, { status: 500 });
    }

    let adminToken = "";
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').trim();
      const authRes = await fetch(`https://${cleanDomain}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials"
        }),
        cache: "no-store"
      });

      if (!authRes.ok) {
        console.error("Auth token fetch failed in Razorpay Webhook:", authRes.status, await authRes.text());
        return NextResponse.json({ success: false, message: "Failed to authenticate with Shopify" }, { status: 401 });
      }

      const authData = await authRes.json();
      adminToken = authData.access_token;
    } catch (e: any) {
      console.error("Error fetching admin token in Razorpay Webhook:", e);
      return NextResponse.json({ success: false, message: e.message || "Internal server error" }, { status: 500 });
    }

    if (!adminToken) {
      return NextResponse.json({ success: false, message: "Empty admin token returned from Shopify" }, { status: 401 });
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').trim();

    // 4. Query Shopify using GraphQL to check if order already exists with this Razorpay Order ID tag
    const shopifyCheckUrl = `https://${cleanDomain}/admin/api/2024-04/graphql.json`;
    const graphqlQuery = `
      query {
        orders(first: 1, query: "tag:razorpay_order_id_${razorpay_order_id}") {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;

    const shopifyCheckRes = await fetch(shopifyCheckUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken
      },
      body: JSON.stringify({ query: graphqlQuery }),
      cache: 'no-store'
    });

    if (shopifyCheckRes.ok) {
      const checkData = await shopifyCheckRes.json();
      const existingOrders = checkData.data?.orders?.edges || [];
      if (existingOrders.length > 0) {
        console.log(`Razorpay Webhook: Order for ${razorpay_order_id} already exists in Shopify. Webhook skipped injection.`, { orderId: existingOrders[0].node.id });
        return NextResponse.json({ success: true, message: "Order already exists in Shopify" });
      }
    } else {
      console.error("Shopify Webhook existing check failed with status:", shopifyCheckRes.status);
    }

    // 5. Establish lock for this order ID
    let resolveLock: any;
    const lockPromise = new Promise((resolve) => {
      resolveLock = resolve;
    });
    activeCreations.set(razorpay_order_id, lockPromise);

    try {
      // 6. Extract metadata saved in Razorpay notes
      const notes = orderEntity?.notes || paymentEntity?.notes || {};
      const cartId = notes.cart_id;
      const email = notes.email;
      const phone = notes.phone;
      const firstName = notes.firstName;
      const lastName = notes.lastName;
      const address1 = notes.address1;
      const address2 = notes.address2;
      const city = notes.city;
      const state = notes.state;
      const zip = notes.zip;
      const couponCode = notes.couponCode;
      const discountAmount = notes.discountAmount;
      const shippingRateTitle = notes.shippingRateTitle || "Complimentary Standard Shipping";
      const shippingRatePrice = notes.shippingRatePrice || "0";

      if (!cartId || !email) {
        console.warn("Razorpay Webhook: Missing checkout metadata in transaction notes. This payment might be from an external source.", { notes });
        return NextResponse.json({ success: true, message: "Transaction ignored: missing custom cart metadata" });
      }

      // 7. Fetch Cart from Shopify to retrieve exact line items
      const cart = await getCart(cartId);
      if (!cart || !cart.lines || cart.lines.edges.length === 0) {
        console.error("Razorpay Webhook Error: Failed to retrieve active cart from Shopify.", { cartId });
        return NextResponse.json({ success: false, message: "Shopify cart expired or not found" }, { status: 400 });
      }

      // 8. Map Line Items
      const lineItems = cart.lines.edges.map((edge: any) => {
        const node = edge.node;
        const variantIdStr = String(node.merchandise?.id || '');
        const numericalVariantId = variantIdStr.includes('gid://') 
          ? variantIdStr.split('/').pop()?.replace(/\D/g, '')
          : variantIdStr.replace(/\D/g, '');

        return {
          variant_id: parseInt(numericalVariantId || '0', 10),
          quantity: node.quantity || 1,
        };
      });

      // 9. Construct Order Payload
      const address = {
        first_name: firstName,
        last_name: lastName,
        address1: address1,
        address2: address2,
        city: city,
        province: state,
        zip: zip,
        country_code: "IN",
        phone: phone
      };

      const parsedDiscountAmount = parseFloat(discountAmount || '0');
      const amountInINR = paymentEntity?.amount ? (paymentEntity.amount / 100).toFixed(2) : "0.00";

      const orderPayload: any = {
        order: {
          line_items: lineItems,
          email: email,
          phone: phone,
          send_receipt: true,
          shipping_address: address,
          billing_address: address,
          financial_status: "paid",
          gateway: "Razorpay",
          tags: `Paid, Razorpay, Custom Checkout, razorpay_order_id_${razorpay_order_id}`,
          shipping_lines: [
            {
              title: shippingRateTitle,
              price: String(parseFloat(shippingRatePrice).toFixed(2)),
              code: "Standard"
            }
          ],
          transactions: [
            {
              kind: "sale",
              status: "success",
              amount: amountInINR,
              gateway: "Razorpay"
            }
          ],
          note_attributes: [
            {
              name: "razorpay_payment_id",
              value: razorpay_payment_id
            },
            {
              name: "razorpay_order_id",
              value: razorpay_order_id
            }
          ]
        }
      };

      if (couponCode && parsedDiscountAmount > 0) {
        orderPayload.order.discount_codes = [
          {
            code: couponCode.trim(),
            amount: parsedDiscountAmount.toFixed(2),
            type: "fixed_amount"
          }
        ];
      }

      // 10. Inject Order into Shopify
      const injectUrl = `https://${cleanDomain}/admin/api/2024-04/orders.json`;
      const injectRes = await fetch(injectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken
        },
        body: JSON.stringify(orderPayload),
        cache: 'no-store'
      });

      const injectData = await injectRes.json();

      if (!injectRes.ok) {
        console.error("Razorpay Webhook: Failed to inject Shopify Order", injectData);
        return NextResponse.json({ success: false, message: "Shopify order injection failed during webhook", errors: injectData.errors }, { status: 500 });
      }

      console.log(`Razorpay Webhook: Successfully injected order into Shopify!`, { orderId: injectData.order.id, orderName: injectData.order.name });
      return NextResponse.json({ success: true, message: "Order injected successfully via webhook", orderId: injectData.order.id });

    } finally {
      // 11. Release lock
      resolveLock();
      activeCreations.delete(razorpay_order_id);
    }

  } catch (error: any) {
    console.error("Razorpay Webhook Exception:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
