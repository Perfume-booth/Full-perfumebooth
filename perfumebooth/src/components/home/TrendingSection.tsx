import ProductCarousel from "@/components/home/ProductCarousel";
import { getCollection } from "@/lib/shopify";
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

export default async function TrendingSection() {
    const trendingCol = await getCollection("trending-perfumes", 15);
    const trendingProducts = extractProducts(trendingCol, 15);
    
    return (
      <ProductCarousel
        products={trendingProducts}
        title="Trending"
        italicPart="Perfumes"
        viewAllLink="/trending-perfumes"
      />
    );
}
