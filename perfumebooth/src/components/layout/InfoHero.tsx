
import Image from "next/image";
import React from "react";

interface InfoHeroProps {
  title: string;
  desktopSrc: string;
  mobileSrc: string;
  pillText?: string;
  effectiveDate?: string;
  description?: string;
  alt?: string;
}

const InfoHero: React.FC<InfoHeroProps> = ({
  desktopSrc,
  mobileSrc,
  alt = "Hero Banner",
}) => {
  return (
    <section className="pt-20 lg:pt-28 mb-8 lg:mb-12">
        <div className="relative w-full h-[40vh] md:h-[25vh] lg:h-[44vh] overflow-hidden shadow-2xl flex items-center justify-center bg-[#1a1a1a]">
          {/* ── Desktop Banner ── */}
          <div id="banner-desktop" className="hidden md:block absolute inset-0">
            <Image
              src={desktopSrc}
              alt={`${alt} - Desktop`}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* ── Mobile Banner ── */}
          <div id="banner-mobile" className="block md:hidden absolute inset-0">
            <Image
              src={mobileSrc || desktopSrc}
              alt={`${alt} - Mobile`}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
    </section>
  );
};

export default InfoHero;
