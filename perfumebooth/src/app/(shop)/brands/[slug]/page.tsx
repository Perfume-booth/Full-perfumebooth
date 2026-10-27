import { getCollectionProducts, getBanner } from "@/lib/catalog";
import SideFilter from "@/components/product/SideFilter";
import CollectionProductGrid from "@/components/product/CollectionProductGrid";
import CollectionBanner from "@/components/ui/CollectionBanner";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { notFound } from "next/navigation";
import { BRAND_MEDIA } from "@/lib/constants";

interface BrandPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: BrandPageProps) {
  const { slug } = await params;
  void searchParams;
  
  // Note: generateMetadata doesn't strictly need all filters, but it helps keep it robust
  const collection = await getCollectionProducts(slug, 1);
  return {
    title: `${collection?.title || "Brand"} | Perfume Booth`,
    
    description: collection?.description || "Explore our premium brand collection.",
  };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;

  const sort = sParams.sort as string;
  const brand = sParams.brand as string;
  const type = sParams.type as string;
  const price = sParams.price as string;
  const availability = sParams.availability as string;
  const gender = sParams.gender as string;

  // Build filter options for the catalog API
  const filterOptions: any[] = [];
  if (brand) {
    brand.split(",").forEach(b => filterOptions.push({ productVendor: b }));
  }
  if (type) {
    type.split(",").forEach(t => filterOptions.push({ productType: t }));
  }
  if (availability) {
    availability.split(",").forEach(a => filterOptions.push({ available: a === "in_stock" }));
  }
  if (gender) {
    gender.split(",").forEach(g => {
        filterOptions.push({ tag: g });
    });
  }
  if (price) {
    const [min, max] = price.split("-").map(Number);
    filterOptions.push({ price: { min, max } });
  }

  let sortKey = "COLLECTION_DEFAULT";
  let reverse = false;

  if (sort === "price-asc") {
    sortKey = "PRICE";
    reverse = false;
  } else if (sort === "price-desc") {
    sortKey = "PRICE";
    reverse = true;
  } else if (sort === "newest") {
    sortKey = "CREATED";
    reverse = true;
  } else if (sort === "trending") {
    sortKey = "BEST_SELLING";
    reverse = false;
  }

  // Fetch brand collection data including products
  // Fetch banner data concurrently
  const [collection, cmsBanner] = await Promise.all([
    getCollectionProducts(slug, 80, null, filterOptions, sortKey, reverse),
    getBanner(slug)
  ]);

  if (!collection) {
    return notFound();
  }

  const { title, products, totalCount, pageInfo, filters } = collection;
  const media = BRAND_MEDIA[slug] || BRAND_MEDIA["default"];
  
  // Extract CMS images if available
  const cmsImages = cmsBanner?.images?.map((img: any) => img.image_url) || [];

  return (
    <main className="pt-20 lg:pt-28">
      <SideFilter
        initialProducts={products}
        initialPageInfo={pageInfo}
        initialFilters={filters}
        collectionHandle={slug}
      >
        <Breadcrumb title={title} totalProducts={totalCount} />
        <CollectionBanner
          title={title}
          collectionHandle={slug}
          bannerImage={media?.type === 'image' ? media.desktopSrc : undefined}
          bannerVideo={media?.type === 'video' ? media.desktopSrc : undefined}
          backendBannerImage={collection.bannerImage}
          cmsBannerImages={cmsImages}
        />
        <CollectionProductGrid />
      </SideFilter>
    </main>
  );
}
