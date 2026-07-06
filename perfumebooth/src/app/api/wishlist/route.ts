import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { items } = body;
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set("mock_wishlist", JSON.stringify(items), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/"
    });

    return NextResponse.json({ success: true });
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

