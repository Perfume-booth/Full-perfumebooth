import ProductCarousel from "@/components/home/ProductCarousel";
import { getCollection, getProducts } from "@/lib/catalog";
import type { Product } from "@/lib/backend/types";

interface ProductEdge {
  node: Product;
}

const extractProducts = (collection: any, limit: number = 15): Product[] => {
  const all = collection?.products?.edges?.map((e: ProductEdge) => e.node) || [];
  const available = all.filter((p: Product) => p.availableForSale);
  return (available.length > 0 ? available : all).slice(0, limit);
};

export default async function TrendingSection({
  title = "Trending",
  italicPart = "Perfumes",
  viewAllLink = "/trending-perfumes",
  collectionHandle = "trending-perfumes",
  limit = 15
}: {
  title?: string;
  italicPart?: string;
  viewAllLink?: string;
  collectionHandle?: string;
  limit?: number;
} = {}) {
    let trendingProducts: Product[] = [];
    try {
      const trendingCol = await getCollection(collectionHandle, limit);
      trendingProducts = extractProducts(trendingCol, limit);
    } catch (err) {
      console.error("Error fetching trending collection:", err);
    }

    if (trendingProducts.length === 0) {
      try {
        const fallback = await getProducts(limit);
        trendingProducts = fallback.slice(0, limit);
      } catch (err) {
        console.error("Error fetching fallback products for TrendingSection:", err);
      }
    }
    
    return (
      <ProductCarousel
        products={trendingProducts}
        title={title}
        italicPart={italicPart}
        viewAllLink={viewAllLink}
      />
    );
}
