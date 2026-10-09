import { NextResponse } from "next/server";

const isDocker = process.env.WATCHPACK_POLLING === "true";
const BACKEND_URL = process.env.BACKEND_API_URL || (isDocker ? "http://django:8000" : "http://localhost:8000");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/orders/validate-coupon/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const rawData = await response.json();
    const data = (rawData && typeof rawData === 'object' && 'data' in rawData && 'meta' in rawData) ? rawData.data : rawData;
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ valid: false, message: "Coupon service unavailable." }, { status: 503 });
  }
}
