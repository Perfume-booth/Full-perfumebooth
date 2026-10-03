import { getBrands } from "@/lib/catalog";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { TOP_BRANDS } from "@/lib/constants";
import FeaturedBrands from "@/components/brand/FeaturedBrands";

export const metadata = {
  title: "Shop by Brand | Perfume Booth",
  description: "Explore our curated selection of premium fragrance brands.",
};



export default async function BrandsPage() {
  const brands = await getBrands();
  
  // Filter for featured brands based on TOP_BRANDS list
  const featuredBrands = TOP_BRANDS.filter(tb => brands.includes(tb));

  // Group brands by letter
  const groupedBrands = brands.reduce((acc: Record<string, string[]>, brand) => {
    const letter = brand[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(brand);
    return acc;
  }, {});

  const letters = Object.keys(groupedBrands).sort();

  return (
    <main className="pt-20 lg:pt-28 pb-20 bg-[#fffcf8]">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-10">
        <Breadcrumb title="All Brands" />
        
        <div className="mt-10 mb-16">
          <h1 className="text-4xl lg:text-7xl font-serif font-bold text-gray-900 mb-6 tracking-tight">
            The <span className="italic text-[var(--color-gold)]">Brand</span> House
          </h1>
          <p className="text-gray-500 max-w-2xl text-lg lg:text-xl font-medium leading-relaxed">
            A curated directory of the world&apos;s most prestigious fragrance houses. From heritage classics to contemporary niche masterpieces.
          </p>
        </div>

        {/* Featured Section */}
        {featuredBrands.length > 0 && (
          <FeaturedBrands brands={featuredBrands} />
        )}

        <div className="h-px w-full bg-gray-100 mb-20" />

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Left: Sticky Alphabet Navigation */}
          <aside className="lg:w-16 shrink-0">
            <div className="lg:sticky lg:top-32 flex flex-wrap lg:flex-col gap-2">
              {letters.map(letter => (
                <a 
                  key={letter} 
                  href={`#brand-${letter}`}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-100 bg-white text-[10px] font-bold text-gray-400 hover:bg-[var(--color-gold)] hover:text-white hover:border-[var(--color-gold)] transition-all shadow-sm"
                >
                  {letter}
                </a>
              ))}
            </div>
          </aside>

          {/* Right: Brands Grid */}
          <div className="flex-1 space-y-24">
            {letters.map(letter => (
              <section key={letter} id={`brand-${letter}`} className="scroll-mt-44">
                <div className="flex items-baseline gap-6 mb-10">
                  <h2 className="text-5xl lg:text-7xl font-serif font-bold text-gray-200 select-none">{letter}</h2>
                  <div className="h-px flex-1 bg-gray-100"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-10">
                  {groupedBrands[letter].sort().map(brand => (
                    <Link 
                      key={brand}
                      href={`/${brand.toLowerCase().replace(/\s+/g, '-')}`}
                      className="group flex flex-col gap-2 transition-all"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100 group-hover:border-[var(--color-gold)] transition-colors">
                        <span className="text-lg lg:text-xl font-serif text-gray-700 group-hover:text-black group-hover:translate-x-1 transition-all">
                          {brand}
                        </span>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-[var(--color-gold)] group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
