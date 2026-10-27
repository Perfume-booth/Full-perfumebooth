'use client';

import type { Product } from '@/app/products/[slug]/page';
import ProductCard from '@/components/product/ProductCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Carousel from '@/components/ui/Carousel';

interface Props {
  products: Product[];
}

export default function RelatedProducts({ products }: Props) {
  if (!products || !products.length) return null;

  return (
    <section className="py-3 md:py-5 bg-[var(--color-bg)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">
        <SectionHeader 
          title="You May" 
          italicPart="Also" 
          suffix="Like" 
          viewAllLink="/all"
        />
        
        <div className="mt-4">
          <Carousel 
            containerClassName="gap-6"
            slideClassName="basis-[calc(50%-12px)] md:basis-[300px]"
            options={{ align: "start", containScroll: "trimSnaps", dragFree: true, loop: products.length > 3 }}
            autoplay={true}
            showDots={true}
          >
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
