import SectionHeader from "@/components/ui/SectionHeader";
import CircleRevealSection from "@/components/ui/CircleRevealSection";
import { getCollection, getProducts } from "@/lib/catalog";
import type { Product } from "@/lib/backend/types";
import NewLaunchesInteractive, { DEFAULT_NEW_LAUNCH_BANNERS } from "./NewLaunchesInteractive";

export default async function NewLaunchesSection() {
  // Fetch up to 20 latest listed products to form 5 sections of 4 cards
  let latestProducts: Product[] = [];
  try {
    const latestCollection = await getCollection("new", 20);
    latestProducts = latestCollection?.products?.edges?.map((edge) => edge.node) || [];
  } catch (err) {
    console.error("Error fetching latest products for NewLaunchesSection:", err);
  }

  // A failed collection request must not skip the catalog fallback.
  if (latestProducts.length === 0) {
    latestProducts = await getProducts(20);
  }

  return (
    <CircleRevealSection origin="arch" className="bg-[#f9f7f2] relative z-10">
      <section className="relative pt-10 pb-8 md:pt-14 md:pb-12" aria-label="New Launches">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-12">
          <SectionHeader
            align="center"
            title="New"
            italicPart="Launches"
          />

          {/* Interactive Banner Carousel + 5-Section 4-Product Carousel */}
          <NewLaunchesInteractive
            products={latestProducts}
            banners={DEFAULT_NEW_LAUNCH_BANNERS}
          />
        </div>
      </section>
    </CircleRevealSection>
  );
}
