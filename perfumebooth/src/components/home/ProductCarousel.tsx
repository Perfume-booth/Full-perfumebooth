"use client";

import ProductCard from "@/components/product/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";
import Carousel from "@/components/ui/Carousel";

interface ProductCarouselProps {
    products: any[];
    title: string;
    italicPart?: string;
    viewAllLink?: string;
}

export default function ProductCarousel({ products = [], title, italicPart, viewAllLink }: ProductCarouselProps) {
    if (!products || products.length === 0) return null;

    return (
        <section className="py-4 md:py-10 bg-[var(--color-bg)] overflow-hidden">
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">                
                <SectionHeader 
                    title={title} 
                    italicPart={italicPart}
                    viewAllLink={viewAllLink}
                />

                <div className="mt-8">
                    <Carousel 
                        containerClassName="gap-6"
                        slideClassName="basis-[calc(50%-12px)] md:basis-[300px]"
                        options={{ align: "start", containScroll: "trimSnaps", dragFree: true }}
                    >
                        {products.map((product, idx) => (
                            <ProductCard key={product.id} product={product} priority={idx < 4} />
                        ))}
                    </Carousel>
                </div>
            </div>
        </section>
    );
}
