import { getBanner, getCMSPage } from "@/lib/catalog";
import HeroBanner from "@/components/home/HeroBanner";
import TopCategories from "@/components/home/CategoryList";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { CollectionSkeleton } from "@/components/ui/CollectionSkeleton";
import BlogSectionWrapper from "@/components/home/BlogSectionWrapper";

const TrendingSection = dynamic(() => import("@/components/home/TrendingSection"), {
  loading: () => <div className="max-w-7xl mx-auto px-4 py-12"><CollectionSkeleton count={4} /></div>
});
const NewLaunchesSection = dynamic(() => import("@/components/home/NewLaunchesSection"), {
  loading: () => <div className="max-w-7xl mx-auto px-4 py-12"><CollectionSkeleton count={4} /></div>
});
const BestSellerSection = dynamic(() => import("@/components/home/BestSellerSection"), {
  loading: () => <div className="max-w-7xl mx-auto px-4 py-12"><CollectionSkeleton count={4} /></div>
});

const VideoSection = dynamic(() => import("@/components/home/VideoSection"), {
  loading: () => <div className="h-[300px] md:h-[500px] w-full bg-white/[0.02] animate-pulse rounded-2xl" />
});
const ScentGrid = dynamic(() => import("@/components/home/ScentGrid"), {
  loading: () => <div className="h-[400px] md:h-[600px] w-full bg-white/[0.02] animate-pulse rounded-2xl" />
});
const BrandSlider = dynamic(() => import("@/components/home/BrandSlider"), {
  loading: () => <div className="h-[80px] md:h-[120px] w-full bg-white/[0.02] animate-pulse rounded-xl" />
});
const InstagramFeed = dynamic(() => import("@/components/home/InstagramFeed"), {
  loading: () => <div className="h-[200px] md:h-[300px] w-full bg-white/[0.02] animate-pulse rounded-xl" />
});
const RecentlyViewed = dynamic(() => import("@/components/product/RecentlyViewed"), {
  loading: () => <div className="h-[250px] md:h-[350px] w-full bg-white/[0.02] animate-pulse rounded-xl" />
});
const GenderSection = dynamic(() => import("@/components/home/GenderSection"), {
  loading: () => <div className="h-[350px] md:h-[500px] w-full bg-white/[0.02] animate-pulse rounded-2xl" />
});

export default async function HomePage() {
  const [cmsPage, banner] = await Promise.all([
    getCMSPage("home").catch(() => null),
    getBanner("home").catch(() => null)
  ]);

  const fallbackSlides = banner?.images?.length ? banner.images.map((image: any) => ({
    id: image.id,
    image: image.image_url,
    mobileImage: image.mobile_image_url || image.image_url,
    href: image.link_url || "/all",
    alt_text: banner.title || "Featured collection"
  })) : [
    { id: 1, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/caneza-for-web-2_jpg_4bd6dc18-fa6c-4301-afa0-a4173564f86b.jpg?v=1790659291", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/caneza-for-web-2_jpg_4bd6dc18-fa6c-4301-afa0-a4173564f86b.jpg?v=1790659291", href: "/caneza", alt_text: "Caneza" },
    { id: 2, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/ARABIYAT_PRESTIGE.webp?v=1784546289", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/ap.jpg?v=1778130171", href: "/arabiyat-prestige", alt_text: "Arabiyat Prestige Premium Fragrances" },
    { id: 3, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-haramain-banner-24001030.webp?v=17845462886", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-banner.jpg?v=1778130178", href: "/al-haramain", alt_text: "Al Haramain Exclusive Perfumes" },
    { id: 4, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori-website.webp?v=1784546289", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori.jpg?v=1778130173", href: "/otoori", alt_text: "Otoori Luxury Attars and Perfumes" },
    { id: 5, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf-website.webp?v=1784546288", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf.jpg?v=1778130170", href: "/mpf", alt_text: "MPF Signature Scents Collection" },
    { id: 6, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/new-nb-for-web_jpg.jpg?v=1787821501", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/new-nb-for-web_jpg.jpg?v=1787821501", href: "/new-nb", alt_text: "New NB Signature Scents Collection" },
    { id: 7, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/lomani_web.png?v=1787821500", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/lomani_web.png?v=1787821500", href: "/lomani", alt_text: "Lomani Signature Scents Collection" },
    { id: 8, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/anfar-for-website_jpg.jpg?v=1787821501", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/anfar-for-website_jpg.jpg?v=1787821501", href: "/anfar", alt_text: "Anfar Signature Scents Collection" },
  ];

  const sections = cmsPage?.sections || [];
  const getSection = (type: string) => sections.find((s: any) => s.type === type);

  const heroSec = getSection('HeroBanner');
  const catSec = getSection('TopCategories');
  const genderSec = getSection('GenderSection');
  const videoSec = getSection('VideoSection');
  const scentSec = getSection('ScentGrid');
  const brandSec = getSection('BrandSlider');
  const instaSec = getSection('InstagramFeed');

  return (
    <>
      {heroSec?.is_visible !== false && (
        <HeroBanner
          slides={heroSec?.content?.slides?.length ? heroSec.content.slides : fallbackSlides}
          title={heroSec?.content?.title}
          subtitle={heroSec?.content?.subtitle}
        />
      )}

      {catSec?.is_visible !== false && (
        <TopCategories data={catSec?.content?.categories} />
      )}

      {genderSec?.is_visible !== false && (
        <div className="deferred-render-section">
          <GenderSection
            cards={genderSec?.content?.cards}
            title={genderSec?.content?.title}
            italicPart={genderSec?.content?.italicPart}
          />
        </div>
      )}

      {videoSec?.is_visible !== false && (
        <div className="deferred-render-section">
          <VideoSection
            items={videoSec?.content?.items}
            title={videoSec?.content?.title}
            italicPart={videoSec?.content?.italicPart}
            suffix={videoSec?.content?.suffix}
          />
        </div>
      )}

      <div className="deferred-render-section">
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12"><CollectionSkeleton count={4} /></div>}>
          <NewLaunchesSection />
        </Suspense>
      </div>

      {scentSec?.is_visible !== false && (
        <div className="deferred-render-section">
          <ScentGrid
            items={scentSec?.content?.items}
            title={scentSec?.content?.title}
            italicPart={scentSec?.content?.italicPart}
            suffix={scentSec?.content?.suffix}
            viewAllLink={scentSec?.content?.viewAllLink}
          />
        </div>
      )}

      <div className="deferred-render-section">
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12"><CollectionSkeleton count={4} /></div>}>
          <TrendingSection />
        </Suspense>
      </div>

      <div className="deferred-render-section">
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12"><CollectionSkeleton count={4} /></div>}>
          <BestSellerSection />
        </Suspense>
      </div>

      <div className="deferred-render-section">
        <RecentlyViewed />
      </div>

      {brandSec?.is_visible !== false && (
        <div className="deferred-render-section">
          <BrandSlider
            brands={brandSec?.content?.brands}
            title={brandSec?.content?.title}
            italicPart={brandSec?.content?.italicPart}
          />
        </div>
      )}

      <div className="deferred-render-section">
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-[var(--color-gold)] font-display tracking-widest uppercase">Loading Journal...</div>}>
          <BlogSectionWrapper />
        </Suspense>
      </div>

      {instaSec?.is_visible !== false && (
        <div className="deferred-render-section">
          <InstagramFeed
            posts={instaSec?.content?.posts}
            title={instaSec?.content?.title}
            italicPart={instaSec?.content?.italicPart}
            viewAllLink={instaSec?.content?.viewAllLink}
          />
        </div>
      )}
    </>
  );
}
