import { getAllCollections } from '@/lib/shopify';
import CollectionsGrid from '@/components/product/CollectionsGrid';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Curated Scent Exhibitions | PerfumeBooth Exclusive Fragrances',
  description: 'Explore our premium olfactory gallery of artisanal fragrances, body care, and curator Exclusive s.',
};

export const revalidate = 3600; // Cache for 1 hour

export default async function CollectionsPage() {
  const collections = await getAllCollections(250);

  // Filter out any "all" collection if it exists to avoid redundancy
  const filteredCollections = collections.filter(c => c.handle !== 'all' && c.handle !== 'frontpage');

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] pt-18 md:pt-32 pb-28 relative overflow-hidden">
      {/* Subtle Ambient Background Glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[80vw] h-[350px] bg-[var(--color-gold)]/5 blur-[140px] pointer-events-none rounded-full" />
      
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16 relative z-10">
        {/* Editorial Header Section */}
        <div className="text-center max-w-4xl mx-auto mb-20 relative">

          <div className="relative py-8 border-t border-b border-[var(--color-border)] my-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-80" />
            
            <h1 className="text-3xl md:text-7xl lg:text-6xl font-serif text-[var(--color-text-primary)] tracking-tight font-normal leading-[1.15]">
              Our <span className="text-[var(--color-gold)] font-light italic">Collections</span>
            </h1>
            
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-80" />
          </div>

          <p className="text-[var(--color-text-muted)] text-base md:text-xl font-light mt-8 max-w-2xl mx-auto leading-relaxed">
            Immerse yourself in our sensory archives. Each collection is meticulously curated to illuminate the invisible art of   perfumery.
          </p>
        </div>
        
        <CollectionsGrid collections={filteredCollections} />
      </div>
    </main>
  );
}
