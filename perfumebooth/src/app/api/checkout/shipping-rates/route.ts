import { NextResponse } from 'next/server';
import { getCart } from '@/lib/shopify/cart';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cartId, shippingAddress } = body;

    // Strict validation of input parameters
    if (!cartId || !shippingAddress) {
      return NextResponse.json({ 
        success: false, 
        message: "Missing required parameters: cartId and shippingAddress payloads." 
      }, { status: 400 });
    }

    const cleanZip = (shippingAddress.zip || "").trim();
    if (cleanZip.length !== 6 || !/^\d+$/.test(cleanZip)) {
      return NextResponse.json({ 
        success: false, 
        message: "Please enter a valid 6-digit PIN Code." 
      }, { status: 400 });
    }

    // Fetch the active cart to determine the subtotal for free shipping eligibility
    const cart = await getCart(cartId);
    
    // Default values if cart fetch fails
    let subtotal = 0;
    if (cart) {
      subtotal = parseFloat(cart.cost?.subtotalAmount?.amount || "0");
    }

    const isFree = subtotal >= 999;

    const shippingRates = isFree 
      ? [
          {
            handle: "free-shipping",
            title: "Complimentary Free Shipping",
            amount: 0,
            currency: "INR"
          }
        ]
      : [
          {
            handle: "default-paid",
            title: "Standard Shipping",
            amount: 119,
            currency: "INR"
          }
        ];

    return NextResponse.json({
      success: true,
      shippingRates
    });

  } catch (error: any) {
    console.error("Headless Shipping Rates API Exception:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Internal server error calculating shipping rates: " + (error.message || "") 
    }, { status: 500 });
  }
}
