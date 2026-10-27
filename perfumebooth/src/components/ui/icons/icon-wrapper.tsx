"use client";

import React, { useEffect } from "react";
import { motion, useAnimation, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  animateOn?: "hover" | "view" | "click";
}

export const pathVariants: Record<string, Variants> = {
  hover: {
    initial: { pathLength: 1, opacity: 1 },
    animate: { 
      pathLength: [1, 0, 1],
      opacity: [1, 0.5, 1],
      transition: { duration: 0.6, ease: "easeInOut" }
    }
  },
  draw: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { 
      pathLength: 1, 
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  },
  pulse: {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.1, 1],
      transition: { duration: 0.4, ease: "easeInOut" }
    }
  }
};

interface IconWrapperProps extends Omit<IconProps, "children"> {
  children: (controls: ReturnType<typeof useAnimation>) => React.ReactNode;
}

export const IconWrapper = ({ 
  children, 
  size = 24, 
  className, 
  animateOn = "hover",
  ...props 
}: IconWrapperProps) => {
  const controls = useAnimation();

  useEffect(() => {
    if (animateOn === "view") {
      controls.start("animate");
    }
  }, [animateOn, controls]);

  const handleMouseEnter = () => {
    if (animateOn === "hover") {
      controls.start("animate");
    }
  };

  return (
    <motion.div
      className={cn("inline-flex items-center justify-center transition-colors", className)}
      onMouseEnter={handleMouseEnter}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {children(controls)}
      </svg>
    </motion.div>
  );
};

