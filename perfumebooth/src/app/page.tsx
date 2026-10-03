import HeroBanner from "@/components/home/HeroBanner";
import TopCategories from "@/components/home/CategoryList";
import { getBanner } from "@/lib/catalog";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { CollectionSkeleton } from "@/components/ui/CollectionSkeleton";
import TrendingSection from "@/components/home/TrendingSection";
import NewLaunchesSection from "@/components/home/NewLaunchesSection";
import BestSellerSection from "@/components/home/BestSellerSection";
import BlogSectionWrapper from "@/components/home/BlogSectionWrapper";

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
  const cmsBanner = await getBanner("home");
  
  // Default fallback if CMS doesn't have the 'home' banner
  const slides = cmsBanner?.images?.length > 0 
    ? cmsBanner.images.map((img: any) => ({
        id: img.id,
        image: img.image_url,
        mobileImage: img.mobile_image_url || img.image_url,
        href: img.link_url || undefined,
      }))
    : [{ id: 1, image: "/images/fallback-luxury.svg", mobileImage: "/images/fallback-luxury.svg", href: "/all", alt_text: "Explore PerfumeBooth fragrances" }];

  return (
    <>
      <HeroBanner slides={slides} />

      <TopCategories />

      <GenderSection />

      <ScentGrid />

      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12"><CollectionSkeleton count={4} /></div>}>
        <TrendingSection />
      </Suspense>

      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12"><CollectionSkeleton count={4} /></div>}>
        <NewLaunchesSection />
      </Suspense>

      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12"><CollectionSkeleton count={4} /></div>}>
        <BestSellerSection />
      </Suspense>

      <RecentlyViewed />

      <BrandSlider />

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-[var(--color-gold)] font-display tracking-widest uppercase">Loading Journal...</div>}>
        <BlogSectionWrapper />
      </Suspense>

      <InstagramFeed />
    </>
  );
}
