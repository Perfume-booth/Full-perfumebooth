import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://django:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/shop/brands/`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    const brands = await res.json();
    return NextResponse.json(brands);
  } catch (error) {
    console.error("Brands API error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
