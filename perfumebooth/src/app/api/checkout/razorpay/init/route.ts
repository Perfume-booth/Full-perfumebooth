import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, form, finalTotal, couponCode, discountAmount, shippingRate } = body;

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

    // 1. Create a pending order in custom Django database first
    const djangoItems = items.map((item: any) => ({
      id: item.id,
      quantity: item.cartQuantity || item.quantity,
    }));

    const selectedRate = shippingRate || { title: "Complimentary Standard Shipping", amount: 0 };

    const djangoPayload = {
      items: djangoItems,
      shipping_address: {
        firstName: form.firstName,
        lastName: form.lastName,
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        zip: form.zip,
        countryCode: "IN",
        phone: form.phone,
        email: form.email,
        shipping_carrier: selectedRate.title,
        shipping_cost: parseFloat(selectedRate.amount || "0")
      },
      payment_method: 'RAZORPAY',
      coupon_code: couponCode || '',
      discount_amount: parseFloat(discountAmount || '0')
    };

    const djangoRes = await fetch('http://django:8000/api/orders/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(djangoPayload)
    });

    if (!djangoRes.ok) {
      const err = await djangoRes.json();
      console.error("Django Order Creation failed in Razorpay Init:", err);
      return NextResponse.json({ 
        success: false, 
        message: err.detail || "Failed to initialize order in database" 
      }, { status: 400 });
    }

    const djangoOrder = await djangoRes.json();

    // 2. Convert amount to paise
    const amountInPaise = Math.round(parseFloat(finalTotal) * 100);

    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      return NextResponse.json({ success: false, message: "Invalid payment amount" }, { status: 400 });
    }

    // 3. Attach internal Django Order UUID to the Razorpay order notes
    const orderOptions = {
      amount: amountInPaise,
      currency: "INR",
      receipt: djangoOrder.order_number,
      notes: {
        order_id: djangoOrder.order_id, // Links directly to internal Order UUID
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
        shippingRateTitle: selectedRate.title,
        shippingRatePrice: String(selectedRate.amount || "0")
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

