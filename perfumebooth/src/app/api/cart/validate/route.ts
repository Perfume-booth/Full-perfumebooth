import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://django:8000/api";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL}/shop/cart/validate/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const rawData = await res.json();
    const data = (rawData && typeof rawData === 'object' && 'data' in rawData && 'meta' in rawData) ? rawData.data : rawData;
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error("Cart Validate API Proxy Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate cart stock" },
      { status: 500 }
    );
  }
}
