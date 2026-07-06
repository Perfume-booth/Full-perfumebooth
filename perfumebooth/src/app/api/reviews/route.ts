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
      const res = await fetch(`http://localhost:8000/api/shop/products/${handle}/`);
      if (res.ok) {
        const p = await res.json();
        rating = p.rating || 4.5;
        ratingCount = p.rating_count || 12;
      }
    } catch (e) {
      console.error("Error fetching product rating from Django in reviews route:", e);
    }
  }

  // Fetch real live reviews from Judge.me API
  let liveJudgemeReviews: any[] = [];
  try {
    const jToken = process.env.JUDGEME_PRIVATE_TOKEN || "K-8hpK-mc8LzBUHwKCjZgVNUQZE";
    const jDomain = process.env.SHOPIFY_STORE_DOMAIN || "perfumesbooth.myshopify.com";
    const jUrl = `https://judge.me/api/v1/reviews?api_token=${jToken}&shop_domain=${jDomain}&per_page=100`;
    const jRes = await fetch(jUrl, { next: { revalidate: 60 } });
    if (jRes.ok) {
      const jData = await jRes.json();
      if (jData && Array.isArray(jData.reviews)) {
        let matchingReviews = jData.reviews;
        if (handle) {
          matchingReviews = matchingReviews.filter((r: any) => r.product_handle === handle);
        }
        liveJudgemeReviews = matchingReviews.map((r: any) => {
          const images = r.pictures ? r.pictures.map((p: any) => p.urls?.huge || p.urls?.original).filter(Boolean) : [];
          return {
            id: `jdgm-${r.id}`,
            productHandle: r.product_handle || handle || "",
            name: r.reviewer?.name || "Verified Buyer",
            email: r.reviewer?.email || "",
            role: "Verified Buyer",
            text: r.body || "",
            rating: r.rating || 5,
            images: images,
            image: images[0] || null,
            isVerified: r.verified !== 'nothing',
            date: r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
          };
        });
      }
    }
  } catch (e) {
    console.error("Error fetching live Judge.me API reviews:", e);
  }

  const combinedReviews = [...liveJudgemeReviews, ...localReviews];
  
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

