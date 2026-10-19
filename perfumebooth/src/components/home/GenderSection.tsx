import Image from "next/image";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";

const GENDER_CARDS = [
  { id: "men", label: "Men", tagline: "Bold. Powerful. Magnetic.", desktopImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-MEN-1.webp?v=1784546289", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-MEN-mobile.jpg_1.jpg?v=1782809007", href: "/men", accent: "#b8924a", glow: "rgba(184,146,74,0.3)" },
  { id: "women", label: "Women", tagline: "Graceful. Radiant. Enchanting.", desktopImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-WOMEN-1.webp?v=1784546288", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-WOMEN-mobile.jpg_1.jpg?v=1782809007", href: "/women", accent: "#e8a0b8", glow: "rgba(232,160,184,0.3)" },
  { id: "unisex", label: "Unisex", tagline: "Boundless. Free. Singular.", desktopImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-UNISEX-1.webp?v=1784546288", mobileImage: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-UNISEX-mobile.jpg_1.jpg?v=1782809006", href: "/unisex", accent: "#8bbfd8", glow: "rgba(139,191,216,0.3)" },
] as const;

function GenderCard({ card }: { card: (typeof GENDER_CARDS)[number] }) {
  return (
    <div className="group relative">
      <Link href={card.href} className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-gold)]" aria-label={`Shop ${card.label} fragrances`}>
        <span className="pointer-events-none absolute -inset-2 -z-10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" style={{ background: card.glow }} />
        <div className="relative overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-shadow duration-300 group-hover:shadow-xl">
          <div className="relative aspect-[3/5] overflow-hidden md:aspect-square">
            <picture className="relative block h-full w-full">
              <source media="(max-width: 767px)" srcSet={card.mobileImage} />
              <source media="(min-width: 768px)" srcSet={card.desktopImage} />
              <Image
                src={card.desktopImage}
                alt={`${card.label} fragrance collection`}
                fill
                sizes="(max-width: 640px) 32vw, (max-width: 1024px) 30vw, 480px"
                quality={75}
                loading="lazy"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </picture>
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 md:p-7">
              <p className="mb-2 hidden text-[9px] font-bold uppercase tracking-[0.3em] text-white/90 sm:block">{card.tagline}</p>
              <div className="flex items-center gap-2 text-white">
                <span className="h-px w-3 transition-all group-hover:w-6" style={{ background: card.accent }} />
                <span className="text-[8px] font-medium uppercase tracking-[0.12em] md:text-[10px] md:tracking-[0.25em]">Explore <span className="hidden sm:inline">{card.label}</span></span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function GenderSection({
  cards,
  title = "Shop By",
  italicPart = "Gender"
}: {
  cards?: any[];
  title?: string;
  italicPart?: string;
} = {}) {
  const displayCards = cards && cards.length > 0 ? cards : GENDER_CARDS;
  return (
    <section className="relative overflow-hidden py-6 md:py-10" aria-label="Shop by gender">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-16">
        <SectionHeader title={title} italicPart={italicPart} />
        <div className="grid grid-cols-3 gap-2 md:gap-5">
          {displayCards.map((card: any) => <GenderCard key={card.id || card.label} card={card} />)}
        </div>
      </div>
    </section>
  );
}
