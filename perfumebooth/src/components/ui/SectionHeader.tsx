"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { AnimatedArrowRight } from "@/components/ui/icons/AnimatedArrowRight";

interface SectionHeaderProps {
    title: string;
    italicPart?: string;
    suffix?: string;
    viewAllLink?: string;
    viewAllText?: string;
}

export default function SectionHeader({
    title,
    italicPart,
    suffix,
    viewAllLink,
    viewAllText = "View All"
}: SectionHeaderProps) {
    return (
        <div className="relative border-b border-[#d1c5b3]/30 mb-8 w-full group">
            <div
                className="absolute hidden lg:block border-t-[3px] border-[#b8924a]  right-0 w-16 transition-all duration-700  group-hover:w-24"
                style={{
                    boxShadow: "0 0 8px rgba(184, 146, 74, 0.4)"
                }}
            />
            <div className="flex flex-row items-center justify-between p-2 lg:p-6 border-l-0 border-r-0 lg:border-l-[3px] lg:border-r-[3px] border-[#b8924a] bg-gradient-to-r from-[#b8924a]/10 via-transparent to-[#b8924a]/10  ">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="font-serif text-lg lg:text-xl lg:text-2xl text-[var(--color-text-primary)] leading-normal font-bold flex items-baseline gap-1">
                        {title} {italicPart && <span className="italic text-[var(--color-gold)]">{italicPart}</span>} {suffix}
                    </h2>
                </motion.div>

                {viewAllLink && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="pr-0"
                    >
                        <Link
                            href={viewAllLink}
                            className="group flex items-center gap-1 lg:gap-2 text-[8px] lg:text-xs font-bold uppercase tracking-[0.3em] text-[#807667] hover:text-[#b8924a] transition-colors duration-300 border-[#b8924a] border rounded-full lg:p-2 p-2"
                        >
                            {viewAllText}
                            <AnimatedArrowRight size={12} animateOn="hover" />
                        </Link>
                    </motion.div>
                )}
            </div>

            {/* Premium Gold Accent Line — Inspired by Policy Pages */}
            <div
                className="absolute hidden lg:block border-b-[3px] border-[#b8924a]  left-0 w-16 transition-all duration-700 lg:w-16  lg:group-hover:w-24"
                style={{
                    boxShadow: "0 0 8px rgba(184, 146, 74, 0.4)"
                }}
            />


        </div>
    );
}
