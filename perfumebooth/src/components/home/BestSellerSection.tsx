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

export default async function BestSellerSection() {
    const bestSellersCol = await getCollection("best-selling-perfumes", 15);
    const bestSellers = extractProducts(bestSellersCol, 15);
    
    return (
      <ProductCarousel
        products={bestSellers}
        title="Our"
        italicPart="Best Sellers"
        viewAllLink="/best-selling-perfumes"
      />
    );
}
