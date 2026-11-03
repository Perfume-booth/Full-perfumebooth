import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const isDocker = process.env.WATCHPACK_POLLING === "true";
const BACKEND_URL = process.env.BACKEND_API_URL || (isDocker ? "http://django:8000" : "http://localhost:8000");

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/orders/coupons/active/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const rawData = await response.json();
    const data = (rawData && typeof rawData === 'object' && 'data' in rawData) ? rawData.data : rawData;
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      { coupons: [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      }
    );
  }
}
