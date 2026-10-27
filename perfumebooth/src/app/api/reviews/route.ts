import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const rawBackend = (process.env.BACKEND_API_URL || "http://django:8000").replace(/\/$/, "");
const BACKEND_URL = rawBackend.endsWith("/api") ? rawBackend : `${rawBackend}/api`;
const unwrap = (raw: any) => raw && typeof raw === "object" && "data" in raw && "meta" in raw ? raw.data : raw;
function present(r: any, handle: string) {
  return { id: String(r.id), productHandle: handle, name: r.user_name || "Customer",
    text: r.comment || "", title: r.title || "", rating: Number(r.rating),
    isVerified: r.is_verified_buyer === true, date: r.created_at?.split("T")[0] || "",
    role: r.is_verified_buyer === true ? "Verified Buyer" : "Customer" };
}
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const identifier = params.get("handle") || params.get("productId") || params.get("id");
  if (!identifier) {
    return NextResponse.json({ success: true, reviews: [], rating: 5, ratingCount: 0, handle: "" });
  }
  try {
    const response = await fetch(`${BACKEND_URL}/shop/products/${encodeURIComponent(identifier)}/reviews/`, { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          reviews: [],
          rating: 0,
          ratingCount: 0,
          handle: identifier,
          system: "native-self-hosted"
        });
      }
      return NextResponse.json({ success: false, error: "Reviews unavailable" }, { status: response.status });
    }
    const data = unwrap(await response.json());
    if (!Array.isArray(data?.reviews)) {
      return NextResponse.json({
        success: true,
        reviews: [],
        rating: 0,
        ratingCount: 0,
        handle: identifier,
        system: "native-self-hosted"
      });
    }
    return NextResponse.json({
      success: true,
      reviews: data.reviews.map((r: any) => present(r, data.product_slug || identifier)),
      rating: data.review_count ? Number(data.average_rating) : 0,
      ratingCount: Number(data.review_count || 0),
      handle: data.product_slug || identifier,
      system: "native-self-hosted"
    });
  } catch (err) {
    console.error("Reviews GET fetch error:", err);
    return NextResponse.json({
      success: true,
      reviews: [],
      rating: 0,
      ratingCount: 0,
      handle: identifier,
      system: "native-self-hosted",
      fallback: true
    });
  }
}
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = (request.headers.get("content-type") || "").includes("multipart/form-data")
      ? Object.fromEntries(await request.formData()) : await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
  const identifier = body?.productId || body?.id || body?.productHandle;
  const rating = Number(body?.rating);
  if (typeof identifier !== "string" || !identifier.trim() || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ success: false, error: "Product and rating (1-5) required" }, { status: 400 });
  }
  try {
    const token = (await cookies()).get("access_token")?.value;
    const response = await fetch(`${BACKEND_URL}/shop/products/${encodeURIComponent(identifier)}/reviews/`, {
      method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ rating, title: body.title || "", comment: body.text || body.comment || "", name: body.name || "", email: body.email || "" })
    });
    const data = unwrap(await response.json());
    if (!response.ok) return NextResponse.json({ success: false, error: data?.detail || "Review submission failed" }, { status: response.status });
    return NextResponse.json({ success: true, review: present(data.review, identifier), backendSynced: true }, { status: response.status });
  } catch {
    // Never fabricate a saved/verified review when Django is unavailable.
    return NextResponse.json({ success: false, error: "Unable to save review. Please try again." }, { status: 503 });
  }
}
