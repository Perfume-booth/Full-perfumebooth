import ProductCarousel from "@/components/home/ProductCarousel";
import { getCollection } from "@/lib/catalog";
import type { Product } from "@/types/product";

interface ProductEdge {
  node: Product;
}

const extractProducts = (collection: any, limit: number = 15): Product[] => {
  return collection?.products?.edges
    ?.map((e: ProductEdge) => e.node)
    ?.filter((p: Product) => p.availableForSale)
    ?.slice(0, limit) || [];
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
    const trendingCol = await getCollection(collectionHandle, limit);
    const trendingProducts = extractProducts(trendingCol, limit);
    
    return (
      <ProductCarousel
        products={trendingProducts}
        title={title}
        italicPart={italicPart}
        viewAllLink={viewAllLink}
      />
    );
}
