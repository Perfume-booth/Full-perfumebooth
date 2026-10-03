import CollectionTemplate from "@/components/product/CollectionTemplate";

export const dynamic = 'force-dynamic';

export default async function AllCollectionsPage({ searchParams }: { searchParams: Promise<any> }) {
  const sParams = await searchParams;
  return (
    <CollectionTemplate 
      handle="all" 
      searchParams={sParams}
      defaultLimit={80}
      bannerImages={["/images/fallback-luxury.svg"]}
    />
  );
}

/* 
// OLD IMPLEMENTATION (Pre-Refactor)
export default async function AllCollectionsPage() {
  // Fetch 'all' collection data
  const collection = await getCollectionProducts("all", 80);

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
        collectionHandle="all"
        title={title || "All Collections"}
      >
        <Breadcrumb title={title || "All Collections"} totalProducts={totalCount} />
        <CollectionBanner
          title={title || "All Collections"}
          collectionHandle="all"
          bannerImages={[
              "/images/banners/main/him-1.jpeg",
              "/images/banners/main/him-2.jpeg",
              "/images/banners/main/her-1.jpeg",
              "/images/banners/main/banner-4.jpeg"
          ]}
        />
        <CollectionProductGrid />
      </SideFilter>
    </main>
  );
}
*/
