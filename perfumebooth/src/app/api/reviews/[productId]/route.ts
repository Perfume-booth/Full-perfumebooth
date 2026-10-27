import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const rawBackend = (process.env.BACKEND_API_URL || "http://django:8000").replace(/\/$/, "");
const BACKEND_URL = rawBackend.endsWith("/api") ? rawBackend : `${rawBackend}/api`;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const res = await fetch(`${BACKEND_URL}/shop/products/${productId}/reviews/`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 }
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error("Reviews GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${BACKEND_URL}/shop/products/${productId}/reviews/`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error("Reviews POST Error:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
