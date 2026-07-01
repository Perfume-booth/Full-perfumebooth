import CollectionTemplate from "@/components/product/CollectionTemplate";

export const metadata = {
  title: "HER — Women's Fragrances | Perfume Booth",
  description:
    "Explore our curated collection of architectural fragrances engineered for impact. Discover premium women's perfumes from Swiss Arabian, Lattafa, Arabiyat Prestige, and more.",
};

export default async function WomenFragrancePage({ searchParams }: { searchParams: Promise<any> }) {
  const sParams = await searchParams;
  return (
    <CollectionTemplate
      handle="perfumes-for-women"
      searchParams={sParams}
    />
  );
}
