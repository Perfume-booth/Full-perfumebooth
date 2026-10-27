'use client';

import { useEffect, useState } from 'react';
import { useRecentStore } from '@/store/useRecentStore';
import ProductCard from '@/components/product/ProductCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Carousel from '@/components/ui/Carousel';

interface Props {
  currentProductId?: string | number;
}

export default function RecentlyViewed({ currentProductId }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const recentItems = useRecentStore((state) => state.recentItems);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Filter out the current product so we don't show what they are currently looking at
  const displayItems = recentItems.filter(p => p.id.toString() !== currentProductId?.toString());

  if (!displayItems.length) return null;

  return (
    <section className="py-3 md:py-5 bg-[var(--color-bg)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">
        <SectionHeader 
          title="Recently" 
          italicPart="Viewed" 
        />
        
        <div className="mt-4">
          <Carousel 
            containerClassName="gap-6"
            slideClassName="basis-[calc(50%-12px)] md:basis-[300px]"
            options={{ align: "start", containScroll: "trimSnaps", dragFree: true }}
          >
            {displayItems.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
