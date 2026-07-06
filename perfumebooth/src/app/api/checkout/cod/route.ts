import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, form, couponCode, discountAmount, shippingRate } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
    }

    // Format items for custom Django order layout (using product UUID and quantity)
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
      payment_method: 'COD',
      coupon_code: couponCode || '',
      discount_amount: parseFloat(discountAmount || '0')
    };

    const res = await fetch('http://localhost:8000/api/orders/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(djangoPayload)
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Django Order Create Error:", err);
      return NextResponse.json({ 
        success: false, 
        message: err.detail || "Failed to create order in database" 
      }, { status: 400 });
    }

    const orderData = await res.json();
    return NextResponse.json({ 
      success: true, 
      orderId: orderData.order_id, 
      orderName: orderData.order_number 
    });

  } catch (error: any) {
    console.error("COD Checkout Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

