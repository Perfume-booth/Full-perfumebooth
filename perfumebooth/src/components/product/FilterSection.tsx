"use client";

import React from "react";
import { AnimatedChevronDown as ChevronDown } from "@/components/ui/icons/AnimatedChevronDown";
import { AnimatedChevronUp as ChevronUp } from "@/components/ui/icons/AnimatedChevronUp";

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <div className="border-b border-[#d1c5b3]/30 pb-6">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between group py-1"
        suppressHydrationWarning
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#807667] group-hover:text-[#b8924a] transition-colors">
            {title}
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp size={12} className="text-[#807667]" animateOn="hover" />
        ) : (
          <ChevronDown size={12} className="text-[#807667]" animateOn="hover" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? "max-h-[500px] mt-5 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
};
