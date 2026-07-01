import CollectionTemplate from "@/components/product/CollectionTemplate";

export default async function AllCollectionsPage({ searchParams }: { searchParams: Promise<any> }) {
  const sParams = await searchParams;
  return (
    <CollectionTemplate 
      handle="all" 
      searchParams={sParams}
      defaultLimit={80}
      bannerImages={[
          "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/him-1.jpg?v=1778138409",
          "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/her_68d94e46-14e2-4643-af21-57c8e879b257.jpg?v=1778138409",
          "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/arabiyat-banner-new_jpg.jpg?v=1778478265",
          "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-haramain.jpg?v=1778138073",
      ]}
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
