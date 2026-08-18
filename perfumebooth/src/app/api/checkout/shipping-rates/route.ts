import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cartId, shippingAddress, subtotal: bodySubtotal } = body;

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
    const subtotal = bodySubtotal !== undefined ? parseFloat(String(bodySubtotal)) : 0;
    const isFree = subtotal >= 999;

    const isDocker = process.env.WATCHPACK_POLLING === "true";
    const BACKEND_URL = process.env.BACKEND_API_URL || (isDocker ? "http://django:8000" : "http://localhost:8000");

    let liveRates: any[] = [];
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/orders/shipping-rates/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: cleanZip, weight: 0.5 }),
      });
      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData?.rates && Array.isArray(backendData.rates)) {
          liveRates = backendData.rates;
        }
      }
    } catch (e) {
      console.warn("Backend shipping rate lookup fallback:", e);
    }

    let shippingRates = [];
    if (isFree) {
      shippingRates = [
        {
          handle: "free-shipping",
          title: "Complimentary Free Shipping",
          amount: 0,
          currency: "INR"
        }
      ];
    } else if (liveRates.length > 0) {
      shippingRates = liveRates.map((r: any, idx: number) => ({
        handle: `shiprocket-courier-${idx}`,
        title: `${r.courier_name} (${r.etd || '3-5 Days'})`,
        amount: Math.round(r.rate),
        currency: "INR"
      }));
    } else {
      shippingRates = [
        {
          handle: "standard-shipping",
          title: "Standard Express Shipping",
          amount: 99,
          currency: "INR"
        }
      ];
    }

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
