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
    const bestSellersCol = await getCollection(collectionHandle, limit);
    const bestSellers = extractProducts(bestSellersCol, limit);
    
    return (
      <ProductCarousel
        products={bestSellers}
        title={title}
        italicPart={italicPart}
        viewAllLink={viewAllLink}
      />
    );
}
