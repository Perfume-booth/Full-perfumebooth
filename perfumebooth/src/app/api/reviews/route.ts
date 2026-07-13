import { NextRequest, NextResponse } from "next/server";
import { readJsonDb, appendToJsonDb } from "@/lib/json-db";

const REVIEWS_FILE = "reviews.json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");

  const dynamicReviews = await readJsonDb<any>(REVIEWS_FILE);
  const localReviews = handle 
    ? dynamicReviews.filter((r: any) => r.productHandle === handle)
    : dynamicReviews;
  
  let rating = 0;
  let ratingCount = 0;

  if (handle) {
    try {
      const backendUrl = process.env.BACKEND_API_URL || "http://django:8000";
      const res = await fetch(`${backendUrl}/api/shop/products/${handle}/`);
      if (res.ok) {
        const p = await res.json();
        rating = p.rating || 4.5;
        ratingCount = p.rating_count || 12;
      }
    } catch (e) {
      console.error("Error fetching product rating from Django in reviews route:", e);
    }
  }

  const combinedReviews = localReviews;
  
  if (combinedReviews.length > 0) {
    const sum = combinedReviews.reduce((acc: any, r: any) => acc + (r.rating || 5), 0);
    rating = parseFloat((sum / combinedReviews.length).toFixed(1));
    ratingCount = combinedReviews.length;
  }


  return NextResponse.json({
    success: true,
    reviews: combinedReviews,
    rating: rating,
    ratingCount: ratingCount,
    handle
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const handle = formData.get("productHandle");
    const name = formData.get("name");
    const email = formData.get("email");
    const text = formData.get("text");
    const rating = formData.get("rating");
    const images = formData.getAll("images");

    if (!name || !text || !rating) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const processedImages = images.map((img: any) => {
       if (typeof img === 'string') return img;
       // If it's a file, we ideally upload to S3/Cloudinary here.
       // For now, mapping to placeholder to avoid crashes.
       return "/placeholder-review-img.jpg";
    });

    const newReview = {
      id: `dr-${Date.now()}`,
      productHandle: handle,
      name,
      email,
      text,
      rating: parseInt(rating as string),
      images: processedImages,
      image: processedImages[0] || null,
      isVerified: false,
      date: new Date().toISOString().split('T')[0],
      role: "Verified Buyer"
    };

    const saved = await appendToJsonDb(REVIEWS_FILE, newReview);
    
    if (saved) {
      return NextResponse.json({ success: true, review: newReview });
    } else {
      return NextResponse.json({ success: false, error: "Failed to save review" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Reviews API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

