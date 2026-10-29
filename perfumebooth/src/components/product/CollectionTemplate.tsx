import { getCollectionProducts, getBanner } from "@/lib/catalog";
import SideFilter from "@/components/product/SideFilter";
import CollectionProductGrid from "@/components/product/CollectionProductGrid";
import CollectionBanner from "@/components/ui/CollectionBanner";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { notFound } from "next/navigation";
import { buildCatalogFilters, getSortConfig } from "@/lib/catalog-filters";

interface CollectionTemplateProps {
  handle: string;
  bannerSlug?: string;
  searchParams?: { [key: string]: string | string[] | undefined };
  title?: string;
  bannerImages?: string[];
  bannerImage?: string;
  defaultLimit?: number;
}

export default async function CollectionTemplate({
  handle,
  bannerSlug,
  searchParams = {},
  title: customTitle,
  bannerImages,
  bannerImage,
  defaultLimit = 80
}: CollectionTemplateProps) {
  // Helper to ensure we have a string from searchParams (handles string[] case)
  const getParam = (key: string) => {
    const val = searchParams[key];
    return Array.isArray(val) ? val[0] : val;
  };

  const sort = getParam("sort");
  const brand = getParam("brand");
  const type = getParam("type");
  const price = getParam("price");
  const availability = getParam("availability");
  const gender = getParam("gender");

  const { sortKey, reverse } = getSortConfig(sort);

  // Build filter options using shared utility
  const priceRange: [number, number] | undefined = price
    ? (price.split("-").map(Number) as [number, number]) 
    : getParam("min") || getParam("max")
      ? [Number(getParam("min") || 0), Number(getParam("max") || 10000)]
      : undefined;

  const filterOptions = buildCatalogFilters({
    brands: brand?.split(","),
    types: type?.split(","),
    availability: availability?.split(","),
    gender: gender?.split(","),
    price: priceRange,
    initialFilters: [] // We use fallbacks for the first SSR call if needed
  });

  // Fetch full collection data with filters applied for SSR
  // Fetch banner data concurrently
  if (getParam("rating")) filterOptions.push({ rating: Number(getParam("rating")) });
  if (getParam("q")) filterOptions.push({ q: getParam("q") });
  const [collection, cmsBanner] = await Promise.all([
    getCollectionProducts(handle, defaultLimit, null, filterOptions, sortKey, reverse),
    getBanner(bannerSlug || handle)
  ]);
  
  if (!collection) {
    return notFound();
  }

  const { title, products, totalCount, pageInfo, filters: initialFilters } = collection;
  
  const filters = initialFilters || [];
  
  const displayTitle = customTitle || title || "Collection";
  
  // Extract CMS images if available
  const cmsImages = cmsBanner?.images?.map((img: any) => img.image_url) || [];

  return (
    <main className="pt-13 lg:pt-28">
      <SideFilter
        initialProducts={products}
        initialPageInfo={pageInfo}
        initialFilters={filters}
        initialTotalCount={totalCount}
        collectionHandle={handle}
        title={displayTitle}
        globalBrands={[]}
      >
        <Breadcrumb title={displayTitle} totalProducts={totalCount} />
        <CollectionBanner
          title={displayTitle}
          collectionHandle={handle}
          bannerImages={bannerImages}
          bannerImage={bannerImage}
          backendBannerImage={collection.bannerImage}
          cmsBannerImages={cmsImages}
        />
        <CollectionProductGrid />
      </SideFilter>
    </main>
  );
}
