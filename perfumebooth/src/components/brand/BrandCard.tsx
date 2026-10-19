import React from "react";
import Image from "next/image";
import Link from "next/link";

export interface BrandCardProps {
  name: string;
  logo?: string;
  href?: string;
  className?: string;
  ctaText?: string;
}

const BRAND_LOGOS: Record<string, string> = {
  "otoori": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori-logo-beverly-web.jpg?v=1787650165",
  "new nb": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/new-nb-logo-beverly-web.jpg?v=1787650165",
  "lomani": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/lomani-logo-beverly-web.jpg?v=1787650165",
  "mpf": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf-logo-beverly-web.jpg?v=1787650165",
  "arabiyat prestige": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/arabiyat-prestige-logo-beverly-web.jpg?v=1787650165",
  "al haramain": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-haramain-logo-beverly-web.jpg?v=1787650166",
  "anfar": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/anfar-logo-beverly-web.jpg?v=1787650165",
  "caneza": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/caneza-logo-beverly-web.jpg?v=1787650165",
  "al wataniyah": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/an-wataniah-logo-beverly-web.jpg?v=1787650166",
  "al watania": "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/an-wataniah-logo-beverly-web.jpg?v=1787650166",
};

export default function BrandCard({
  name,
  logo,
  href = "#",
  className = "",
}: BrandCardProps) {
  const effectiveLogo = logo || BRAND_LOGOS[name.toLowerCase()] || "";

  return (
    <Link
      href={href}
      className={`group/brand relative block aspect-[347/217] w-full overflow-hidden rounded-xl border border-[#e5ded4] bg-[#FAF2E9] shadow-[0_2px_10px_rgba(40,30,20,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-[#b8924a]/50 hover:shadow-[0_12px_28px_rgba(40,30,20,0.12)] ${className}`}
    >
      {/* ── Left Ornate Flourish & Lines (from Image 1) ── */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 top-0 w-[35%] select-none overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, black 70%, transparent 100%)",
        }}
      >
        <Image
          src="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/brand-card-left.webp?v=1791004553"
          alt=""
          fill
          priority={false}
          sizes="(max-width: 768px) 120px, 140px"
          className="object-cover object-left transition-transform duration-700 group-hover/brand:scale-[1.02]"
        />
      </div>

      {/* ── Right Ornate Flourish & Lines (from Image 2) ── */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 top-0 w-[35%] select-none overflow-hidden"
        style={{
          maskImage: "linear-gradient(to left, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to left, black 70%, transparent 100%)",
        }}
      >
        <Image
          src="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/brand-card-right.webp?v=1791004553"
          alt=""
          fill
          priority={false}
          sizes="(max-width: 768px) 120px, 140px"
          className="object-cover object-right transition-transform duration-700 group-hover/brand:scale-[1.02]"
        />
      </div>

      {/* ── Center Content Area: Brand Logo centered ── */}
      <div className="relative flex h-full w-full items-center justify-center px-8 py-4 sm:px-10 sm:py-5">
        <div className="relative flex h-20 w-44 sm:h-24 sm:w-52 md:h-28 md:w-56 items-center justify-center">
          {effectiveLogo ? (
            <Image
              src={effectiveLogo}
              alt={name}
              fill
              sizes="(max-width: 768px) 176px, 224px"
              style={{ mixBlendMode: "multiply" }}
              className="object-contain opacity-90 transition-all duration-500 group-hover/brand:scale-108 group-hover/brand:opacity-100"
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <span className="font-serif text-3xl sm:text-4xl font-bold tracking-widest text-[#4a3a2f] uppercase">
                {name}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
