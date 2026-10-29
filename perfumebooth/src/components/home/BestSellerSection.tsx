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

export default async function BestSellerSection({
  title = "Our",
  italicPart = "Best Sellers",
  viewAllLink = "/best-selling-perfumes",
  collectionHandle = "best-selling-perfumes",
  limit = 15
}: {
  title?: string;
  italicPart?: string;
  viewAllLink?: string;
  collectionHandle?: string;
  limit?: number;
} = {}) {
    let bestSellers: Product[] = [];
    try {
      const bestSellersCol = await getCollection(collectionHandle, limit);
      bestSellers = extractProducts(bestSellersCol, limit);
    } catch (err) {
      console.error("Error fetching best sellers collection:", err);
    }

    if (bestSellers.length === 0) {
      try {
        const fallback = await getProducts(limit);
        bestSellers = fallback.slice(0, limit);
      } catch (err) {
        console.error("Error fetching fallback products for BestSellerSection:", err);
      }
    }
    
    return (
      <ProductCarousel
        products={bestSellers}
        title={title}
        italicPart={italicPart}
        viewAllLink={viewAllLink}
      />
    );
}
