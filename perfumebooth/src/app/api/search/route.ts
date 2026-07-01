import { NextRequest, NextResponse } from "next/server";
import { searchProducts, getBrands, getProductTypes } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "*";
  const sortKey = searchParams.get("sort") || "RELEVANCE";
  const reverse = searchParams.get("reverse") === "true";
  const first = parseInt(searchParams.get("first") || "30");

  try {
    const [searchResult, brands, productTypes] = await Promise.all([
      searchProducts(query, first, sortKey, reverse),
      getBrands(),
      getProductTypes(),
    ]);

    return NextResponse.json({
      products: searchResult.products,
      totalCount: searchResult.totalCount,
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
