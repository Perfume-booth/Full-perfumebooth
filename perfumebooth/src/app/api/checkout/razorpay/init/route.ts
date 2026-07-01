import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, form, finalTotal, shopifyCartId, couponCode, discountAmount, shippingRate } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay API credentials are missing from environment variables.");
      return NextResponse.json({ 
        success: false, 
        message: "Razorpay credentials configuration error." 
      }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Convert amount to paise (multiply INR by 100 and round to prevent floating point inaccuracies)
    const amountInPaise = Math.round(parseFloat(finalTotal) * 100);

    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      return NextResponse.json({ success: false, message: "Invalid payment amount" }, { status: 400 });
    }

    // Attach all necessary metadata to the Razorpay order notes (limited to 15 key-value pairs, values up to 256 chars)
    // This allows the server-to-server Webhook fallback to reconstruct the order if the browser drops off!
    const orderOptions = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_pb_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: {
        cart_id: shopifyCartId || "",
        email: form?.email || "",
        phone: form?.phone || "",
        firstName: form?.firstName || "",
        lastName: form?.lastName || "",
        address1: form?.address1 || "",
        address2: form?.address2 || "",
        city: form?.city || "",
        state: form?.state || "",
        zip: form?.zip || "",
        couponCode: couponCode || "",
        discountAmount: String(discountAmount || "0"),
        shippingRateTitle: shippingRate?.title || "Complimentary Standard Shipping",
        shippingRatePrice: String(shippingRate?.amount || "0")
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    if (!order || !order.id) {
      console.error("Razorpay Order creation returned empty result:", order);
      return NextResponse.json({ success: false, message: "Failed to initialize payment with gateway" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      keyId: keyId
    });

  } catch (error: any) {
    console.error("Razorpay Payment Init Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
