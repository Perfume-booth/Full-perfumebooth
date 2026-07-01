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

export default async function NewLaunchesSection() {
  const newLaunchesCol = await getCollection("new", 15);
  const newLaunches = extractProducts(newLaunchesCol, 15);

  return (
    <ProductCarousel
      products={newLaunches}
      title="New"
      italicPart="Launches"
      viewAllLink="/new"
    />
  );
}
