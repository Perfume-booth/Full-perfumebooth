import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = body;

    // 1. Validate Input Params
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, message: "Missing required request parameters" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error("RAZORPAY_KEY_SECRET environment variable is missing.");
      return NextResponse.json({ success: false, message: "Server configuration error" }, { status: 500 });
    }

    // 2. Cryptographically Verify Razorpay Signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn("Razorpay Payment Verification Failed: Signature Mismatch", {
        received: razorpay_signature,
        expected: expectedSignature
      });
      return NextResponse.json({ success: false, message: "Payment signature verification failed. Transaction was not completed securely." }, { status: 400 });
    }

    console.log(`Razorpay Verify API: Payment signature verified successfully for Order ID ${razorpay_order_id}. Success page can be shown.`);

    return NextResponse.json({
      success: true,
      orderId: razorpay_order_id
    });

  } catch (error: any) {
    console.error("Razorpay Verification API Exception:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
