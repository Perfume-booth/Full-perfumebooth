import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://django:8000";

function cleanImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace('http://django:8000', '').replace('http://localhost:8000', '');
}

function mapProduct(p: any) {
  const images = p.images?.map((img: any) => ({
    url: cleanImageUrl(img.url) || '',
    altText: img.altText || p.title
  })) || [];
  const priceVal = parseFloat(p.price || "0").toFixed(2);
  const comparePriceVal = p.compare_at_price ? parseFloat(p.compare_at_price).toFixed(2) : undefined;

  return {
    id: String(p.id),
    handle: p.slug,
    title: p.title,
    description: p.description || '',
    availableForSale: p.is_online && (p.stock_count > 0 || p.stock > 0),
    vendor: p.vendor || p.brand || 'Perfume Booth',
    tags: p.tags || [],
    productType: p.productType || p.category || '',
    priceRange: { minVariantPrice: { amount: priceVal, currencyCode: "INR" } },
    compareAtPriceRange: comparePriceVal ? { minVariantPrice: { amount: comparePriceVal, currencyCode: "INR" } } : undefined,
    featuredImage: images.length > 0 ? images[0] : (p.image ? { url: cleanImageUrl(p.image) || '', altText: p.title } : undefined),
    images: { edges: images.map((img: any) => ({ node: img })), nodes: images },
    rating: p.rating || 0,
    rating_count: p.rating_count || 0,
  };
}

export async function GET(request: NextRequest) {
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

    let products = productsRes.ok ? (await productsRes.json()).map(mapProduct) : [];
    const brands = brandsRes.ok ? await brandsRes.json() : [];
    const facets = facetsRes.ok ? await facetsRes.json() : null;
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
