import { getCollectionProducts, getBrands, getProductTypes, getBanner } from "@/lib/shopify";
import SideFilter from "@/components/product/SideFilter";
import CollectionProductGrid from "@/components/product/CollectionProductGrid";
import CollectionBanner from "@/components/ui/CollectionBanner";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { notFound } from "next/navigation";
import { buildShopifyFilters, getSortConfig } from "@/lib/shop-utils";

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
  const priceRange: [number, number] = price 
    ? (price.split("-").map(Number) as [number, number]) 
    : [0, 10000];

  const filterOptions = buildShopifyFilters({
    brands: brand?.split(","),
    types: type?.split(","),
    availability: availability?.split(","),
    gender: gender?.split(","),
    price: priceRange,
    initialFilters: [] // We use fallbacks for the first SSR call if needed
  });

  // Fetch full collection data with filters applied for SSR
  // Fetch banner data concurrently
  const [collection, totalVendors, cmsBanner] = await Promise.all([
    getCollectionProducts(handle, defaultLimit, null, filterOptions, sortKey, reverse),
    getBrands(),
    getBanner(bannerSlug || handle)
  ]);
  
  if (!collection) {
    return notFound();
  }

  const { title, products, totalCount, pageInfo, filters: initialFilters } = collection;
  
  // Ensure we always have a Brand filter in the sidebar
  let filters = [...(initialFilters || [])];
  const brandFilter = filters.find(f => f.id.toLowerCase().includes('vendor') || f.label.toLowerCase().includes('brand'));
  
  if (!brandFilter && totalVendors && totalVendors.length > 0) {
    filters.push({
      id: 'filter.p.vendor',
      label: 'Brand',
      type: 'LIST',
      values: totalVendors.map((v: any) => ({
        id: v,
        label: v,
        count: 0,
        input: JSON.stringify({ productVendor: v })
      }))
    });
  }
  
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
        globalBrands={totalVendors}
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
