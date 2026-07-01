import CollectionTemplate from "@/components/product/CollectionTemplate";

export const metadata = {
  title: "New Arrivals — Latest Scent Creations | Perfume Booth",
  description: "Discover our newest additions to the architectural scent collection. Explore fresh, innovative, and mystical fragrances from top Exclusive brands.",
};

export default async function NewArrivalsPage({ searchParams }: { searchParams: Promise<any> }) {
  const sParams = await searchParams;
  return (
    <CollectionTemplate 
      handle="new" 
      searchParams={sParams}
      title="New Arrivals"
    />
  );
}
