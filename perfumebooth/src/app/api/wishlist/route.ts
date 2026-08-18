import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://django:8000/api";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (accessToken) {
      const res = await fetch(`${BACKEND_URL}/shop/wishlist/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // Guest wishlist cookie fallback
    const { items } = body;
    if (items && Array.isArray(items)) {
      cookieStore.set("mock_wishlist", JSON.stringify(items), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/"
      });
    }

    return NextResponse.json({ success: true, items: items || [] });
  } catch (error: any) {
    console.error("Wishlist POST API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (accessToken) {
      const res = await fetch(`${BACKEND_URL}/shop/wishlist/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    }

    // Guest fallback
    const wishlistStr = cookieStore.get("mock_wishlist")?.value;
    const wishlistData = wishlistStr ? JSON.parse(wishlistStr) : [];

    return NextResponse.json({ items: wishlistData });
  } catch (error: any) {
    console.error("Wishlist GET API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json({ error: "product_id parameter is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (accessToken) {
      const res = await fetch(`${BACKEND_URL}/shop/wishlist/${productId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Wishlist DELETE API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
