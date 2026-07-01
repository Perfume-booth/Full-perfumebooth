import CollectionTemplate from "@/components/product/CollectionTemplate";

export const metadata = {
  title: "HIM — Men's Fragrances | Perfume Booth",
  description:
    "Explore our curated collection of architectural fragrances engineered for impact. Discover premium men's perfumes from Swiss Arabian, Lattafa, Arabiyat Prestige, and more.",
};

export default async function MenFragrancePage({ searchParams }: { searchParams: Promise<any> }) {
  const sParams = await searchParams;
  return (
    <CollectionTemplate 
      handle="perfumes-for-men" 
      searchParams={sParams}
    />
  );
}

/*
// OLD IMPLEMENTATION
export default async function MenFragrancePage() {
  const collection = await getCollectionProducts("perfumes-for-men", 24);

  if (!collection) {
    return notFound();
  }

  const { title, products, totalCount, pageInfo, filters } = collection;

  return (
    <main className="pt-20 lg:pt-28">
      <SideFilter
        initialProducts={products}
        initialPageInfo={pageInfo}
        initialFilters={filters}
        initialTotalCount={totalCount}
        collectionHandle="perfumes-for-men"
        title={title || "Men's Collection"}
      >
        <Breadcrumb title={title || "HIM — Men's Fragrances"} totalProducts={totalCount} />
        <CollectionBanner
          collectionHandle="perfumes-for-men"
          bannerImages={[
              "/images/banners/main/him-1.jpeg",
              "/images/banners/main/him-2.jpeg"
          ]}
        />
        <CollectionProductGrid />
      </SideFilter>
    </main>
  );
}
*/
