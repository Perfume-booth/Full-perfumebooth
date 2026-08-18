import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readJsonDb, appendToJsonDb } from "@/lib/json-db";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://django:8000/api";
const REVIEWS_FILE = "reviews.json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") || searchParams.get("id");
  const handle = searchParams.get("handle");

  if (productId) {
    try {
      const res = await fetch(`${BACKEND_URL}/shop/products/${productId}/reviews/`, {
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          reviews: data.reviews.map((r: any) => ({
            id: r.id,
            name: r.user_name,
            text: r.comment,
            rating: r.rating,
            isVerified: r.is_verified_buyer,
            date: r.created_at
          })),
          rating: data.average_rating,
          ratingCount: data.review_count
        });
      }
    } catch (e) {
      console.error("Backend reviews fetch error:", e);
    }
  }

  // Fallback to local reviews DB
  const dynamicReviews = await readJsonDb<any>(REVIEWS_FILE);
  const localReviews = handle 
    ? dynamicReviews.filter((r: any) => r.productHandle === handle)
    : dynamicReviews;

  let rating = 4.5;
  let ratingCount = localReviews.length;

  if (localReviews.length > 0) {
    const sum = localReviews.reduce((acc: any, r: any) => acc + (r.rating || 5), 0);
    rating = parseFloat((sum / localReviews.length).toFixed(1));
  }

  return NextResponse.json({
    success: true,
    reviews: localReviews,
    rating,
    ratingCount,
    handle
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let productId = "";
    let rating = "5";
    let title = "";
    let text = "";
    let name = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      productId = (formData.get("productId") || formData.get("id") || formData.get("productHandle")) as string;
      rating = (formData.get("rating") || "5") as string;
      title = (formData.get("title") || "") as string;
      text = (formData.get("text") || formData.get("comment") || "") as string;
      name = (formData.get("name") || "") as string;
    } else {
      const body = await request.json();
      productId = body.productId || body.id || body.productHandle;
      rating = body.rating || 5;
      title = body.title || "";
      text = body.text || body.comment || "";
      name = body.name || "";
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (accessToken && productId) {
      const res = await fetch(`${BACKEND_URL}/shop/products/${productId}/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ rating, title, comment: text })
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          review: {
            id: data.review.id,
            name: name || "You",
            text: data.review.comment,
            rating: data.review.rating,
            isVerified: data.review.is_verified_buyer,
            date: new Date().toISOString()
          }
        });
      }
    }

    // Local fallback
    const newReview = {
      id: `dr-${Date.now()}`,
      productHandle: productId,
      name: name || "Anonymous Connoisseur",
      text,
      rating: Number(rating),
      isVerified: false,
      date: new Date().toISOString().split('T')[0]
    };

    await appendToJsonDb(REVIEWS_FILE, newReview);
    return NextResponse.json({ success: true, review: newReview });
  } catch (error: any) {
    console.error("Reviews API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
