import CollectionTemplate from "@/components/product/CollectionTemplate";

export const metadata = {
  title: "Sale — Exclusive  Offers | Perfume Booth",
  description: "Discover Exclusive  offers on our premium fragrance collection.",
};

export default async function SaleCollectionPage({ searchParams }: { searchParams: Promise<any> }) {
  const sParams = await searchParams;
  return (
    <CollectionTemplate 
      handle="sale" 
      searchParams={sParams}
    />
  );
}
