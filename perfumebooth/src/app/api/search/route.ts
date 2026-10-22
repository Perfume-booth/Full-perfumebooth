import { NextRequest, NextResponse } from "next/server";
import { mapDjangoProductToProduct } from "@/lib/backend/products";
import { isRateLimited } from "@/lib/rate-limit";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://django:8000";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
  if (isRateLimited(ip, 60, 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "*";
  const sortKey = searchParams.get("sort") || "RELEVANCE";
  const reverse = searchParams.get("reverse") === "true";
  const first = parseInt(searchParams.get("first") || "30");

  try {
    // Fetch products from Django backend with search query
    const searchParam = query && query !== "*" ? `?search=${encodeURIComponent(query)}` : "";
    const [productsRes, brandsRes, facetsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/shop/products/${searchParam}`, { cache: "no-store" }),
      fetch(`${BACKEND_URL}/api/shop/brands/`, { cache: "no-store" }),
      fetch(`${BACKEND_URL}/api/shop/facets/`, { cache: "no-store" }),
    ]);

    if (!productsRes.ok) return NextResponse.json({ error: 'Search temporarily unavailable' }, { status: 502 });
    const rawProducts = await productsRes.json();
    const productsData = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.data && Array.isArray(rawProducts.data) ? rawProducts.data : []);
    let products = productsData.map(mapDjangoProductToProduct);

    const rawBrands = brandsRes.ok ? await brandsRes.json() : [];
    const brands = Array.isArray(rawBrands) ? rawBrands : (rawBrands?.data && Array.isArray(rawBrands.data) ? rawBrands.data : []);

    const rawFacets = facetsRes.ok ? await facetsRes.json() : null;
    const facets = (rawFacets?.data && typeof rawFacets.data === 'object') ? rawFacets.data : rawFacets;
    const productTypes = facets?.productTypes?.map((f: any) => f.value) || [];

    // Sort
    if (sortKey === "PRICE") {
      products.sort((a: any, b: any) => parseFloat(a.priceRange.minVariantPrice.amount) - parseFloat(b.priceRange.minVariantPrice.amount));
    }
    if (reverse) products.reverse();

    return NextResponse.json({
      products: products.slice(0, first),
      totalCount: products.length,
      brands,
      productTypes,
    });
  } catch (error: any) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
