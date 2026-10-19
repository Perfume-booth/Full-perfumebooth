"use client";

import Link from "next/link";
import { AnimatedArrowRight } from "@/components/ui/icons/AnimatedArrowRight";

interface SectionHeaderProps {
    title: string;
    italicPart?: string;
    suffix?: string;
    subtitle?: string;
    viewAllLink?: string;
    viewAllText?: string;
    align?: "left" | "center";
}

export default function SectionHeader({
    title,
    italicPart,
    suffix,
    subtitle,
    viewAllLink,
    viewAllText = "View All",
    align = "left",
}: SectionHeaderProps) {
    if (align === "center") {
        return (
            <div className="flex flex-col items-center justify-center text-center mb-8 md:mb-12 w-full group">
                {subtitle && (
                    <span className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-[#8c8275] font-semibold mb-2 block">
                        {subtitle}
                    </span>
                )}

                <div>
                    <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[var(--color-text-primary)] font-bold tracking-tight flex items-baseline justify-center gap-2 flex-wrap">
                        <span>{title}</span>

                        {italicPart && (
                            <span className="italic text-[var(--color-gold)] font-normal">
                                {italicPart}
                            </span>
                        )}

                        {suffix && (
                            <span>{suffix}</span>
                        )}
                    </h2>
                </div>

                {/* Subtle Gold Center Divider */}
                <div
                    className="w-12 h-[2px] bg-[#b8924a] mt-3.5 mb-2 rounded-full"
                    style={{
                        boxShadow: "0 0 8px rgba(184, 146, 74, 0.4)"
                    }}
                />

                {viewAllLink && (
                    <div className="mt-2">
                        <Link
                            href={viewAllLink}
                            className="group/link inline-flex items-center gap-1.5 text-[9px] md:text-[11px] font-bold uppercase tracking-[0.25em] text-[#807667] hover:text-[#b8924a] transition-colors duration-300 border border-[#b8924a]/50 hover:border-[#b8924a] rounded-full px-4 py-1.5"
                        >
                            {viewAllText}
                            <AnimatedArrowRight size={12} animateOn="hover" />
                        </Link>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative border-b border-[#d1c5b3]/30 mb-8 w-full group">
            {/* Top Right Decorative Gold Line */}
            <div
                className="absolute hidden lg:block border-t-[3px] border-[#b8924a] right-0 w-16 transition-all duration-700 group-hover:w-24"
                style={{
                    boxShadow: "0 0 8px rgba(184, 146, 74, 0.4)"
                }}
            />

            <div className="flex flex-row items-center justify-between p-2 lg:p-6 border-l-0 border-r-0 lg:border-l-[3px] lg:border-r-[3px] border-[#b8924a] bg-gradient-to-r from-[#b8924a]/10 via-transparent to-[#b8924a]/10">
                <h2 className="font-serif text-base lg:text-xl lg:text-2xl text-[var(--color-text-primary)] leading-normal font-bold flex items-baseline gap-1.5 flex-wrap">
                    <span>{title}</span>
                    {italicPart && (
                        <span className="italic text-[var(--color-gold)] font-normal">
                            {italicPart}
                        </span>
                    )}
                    {suffix && <span>{suffix}</span>}
                </h2>

                {viewAllLink && (
                    <div className="pr-0">
                        <Link
                            href={viewAllLink}
                            className="group flex items-center gap-1 lg:gap-2 text-[7px] lg:text-xs font-bold uppercase tracking-[0.3em] text-[#807667] hover:text-[#b8924a] transition-colors duration-300 border-[#b8924a] border rounded-full lg:p-2 p-1.5"
                        >
                            {viewAllText}
                            <AnimatedArrowRight size={12} animateOn="hover" />
                        </Link>
                    </div>
                )}
            </div>

            {/* Bottom Left Decorative Gold Line */}
            <div
                className="absolute hidden lg:block border-b-[3px] border-[#b8924a] left-0 w-16 transition-all duration-700 lg:w-16 lg:group-hover:w-24"
                style={{
                    boxShadow: "0 0 8px rgba(184, 146, 74, 0.4)"
                }}
            />
        </div>
    );
}
