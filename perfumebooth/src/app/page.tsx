import HeroBanner from "@/components/home/HeroBanner";
import TopCategories from "@/components/home/CategoryList";
import { getBanner } from "@/lib/shopify";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { CollectionSkeleton } from "@/components/ui/CollectionSkeleton";
import TrendingSection from "@/components/home/TrendingSection";
import NewLaunchesSection from "@/components/home/NewLaunchesSection";
import BestSellerSection from "@/components/home/BestSellerSection";
import BlogSectionWrapper from "@/components/home/BlogSectionWrapper";

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
  const cmsBanner = await getBanner("home");
  
  // Default fallback if CMS doesn't have the 'home' banner
  const slides = cmsBanner?.images?.length > 0 
    ? cmsBanner.images.map((img: any) => ({
        id: img.id,
        image: img.image_url,
        mobileImage: img.mobile_image_url || img.image_url,
        href: img.link_url || undefined,
      }))
    : [
        { id: 1, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/ARABIYAT_PRESTIGE.webp?v=1784546289", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/ap.jpg?v=1778130171", href: "/arabiyat-prestige", alt_text: "Arabiyat Prestige Premium Fragrances" },
          { id: 2, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-haramain-banner-24001030.webp?v=17845462886", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-banner.jpg?v=1778130178", href: "/al-haramain", alt_text: "Al Haramain Exclusive Perfumes" },
          { id: 3, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori-website.webp?v=1784546289", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori.jpg?v=1778130173", href: "/otoori", alt_text: "Otoori Luxury Attars and Perfumes" },
          { id: 4, image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf-website.webp?v=1784546288", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf.jpg?v=1778130170", href: "/mpf", alt_text: "MPF Signature Scents Collection" },
      ];

  return (
    <>
      <HeroBanner slides={slides} />

      <TopCategories />

      <GenderSection />

      <VideoSection />

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