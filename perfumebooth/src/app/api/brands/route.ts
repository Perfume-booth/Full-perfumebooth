import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://django:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/shop/brands/`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
    const rawBrands = await res.json();
    const brands = (rawBrands?.data && Array.isArray(rawBrands.data)) ? rawBrands.data : (Array.isArray(rawBrands) ? rawBrands : []);
    return NextResponse.json(brands);
  } catch (error) {
    console.error("Brands API error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
