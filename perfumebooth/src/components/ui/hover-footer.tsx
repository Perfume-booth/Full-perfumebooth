"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextHoverEffect = ({
  text,
  duration,
  className,
}: {
  text: string;
  duration?: number;
  automatic?: boolean;
  className?: string;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor]);

  // Framer Motion Variants for Staggered Slide-Up Pop of Logo Groups
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.06,
      },
    },
  } as const;

  const groupVariants = {
    hidden: { 
      y: 60, 
      opacity: 0,
      scale: 0.8,
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 90,
        mass: 0.8
      },
    },
  } as const;

  const barVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: {
      scaleX: 1,
      opacity: 1,
      transition: {
        delay: 0.3, // delays slightly to scale in after e2 pops up
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  } as const;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 500 120"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={cn("select-none cursor-pointer w-full max-w-4xl mx-auto h-auto", className)}
    >
      <g transform="translate(33, 0)">
        {/* ================= SINGLE LAYER: NATURAL BRAND LOGO (Slides up & pops staggered on scroll/load) ================= */}
        <motion.g
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* p group */}
          <motion.g variants={groupVariants} style={{ transformOrigin: "30px 65px" }}>
            <circle cx="30" cy="66" r="11" fill="var(--color-text-primary)"  />
            <text x="14" y="80" className="font-bold text-[55px] select-none font-sans" fill="var(--color-text-primary)">p</text>
          </motion.g>

          {/* e1 group */}
          <motion.g variants={groupVariants} style={{ transformOrigin: "62px 60px" }}>
            <circle cx="62" cy="60" r="8" fill="var(--color-text-primary)"  />
            <text x="47" y="80" className="font-bold text-[55px] select-none font-sans" fill="var(--color-text-primary)">e</text>
          </motion.g>

          {/* rfum group */}
          <motion.g variants={groupVariants} style={{ transformOrigin: "140px 65px" }}>
            <text x="80" y="80" className="font-bold text-[55px] select-none font-sans" fill="var(--color-text-primary)" letterSpacing="1">rfum</text>
          </motion.g>

          {/* e2 group */}
          <motion.g variants={groupVariants} style={{ transformOrigin: "225px 60px" }}>
            <circle cx="225" cy="60" r="8" fill="var(--color-text-primary)"  />
            <text x="210" y="80" className="font-bold text-[55px] select-none font-sans" fill="var(--color-text-primary)">e</text>
            <motion.line 
              x1="213" 
              y1="45" 
              x2="238" 
              y2="45" 
              stroke="var(--color-text-primary)" 
              strokeWidth="4"
              style={{ transformOrigin: "213px 45px" }}
              variants={barVariants}
            />
          </motion.g>

          {/* b group */}
          <motion.g variants={groupVariants} style={{ transformOrigin: "260px 65px" }}>
            <circle cx="260" cy="65" r="11" fill="var(--color-text-primary)"  />
            <text x="243" y="80" className="font-bold text-[55px] select-none font-sans" fill="var(--color-text-primary)">b</text>
          </motion.g>

          {/* circles o group */}
          <motion.g variants={groupVariants} style={{ transformOrigin: "315px 70px", isolation: "isolate" }}>
            <motion.circle 
              cx="300" 
              cy="65" 
              r="18" 
              fill="rgba(240, 160, 210, 0.85)" 
              style={{ mixBlendMode: "multiply", transformOrigin: "300px 65px" }} 
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
            />
            <motion.circle 
              cx="330" 
              cy="65" 
              r="18" 
              fill="rgba(110, 200, 240, 0.85)" 
              style={{ mixBlendMode: "multiply", transformOrigin: "330px 65px" }} 
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.7 }}
            />
            <motion.circle 
              cx="315" 
              cy="82" 
              r="18" 
              fill="rgba(250, 220, 90, 0.95)" 
              style={{ mixBlendMode: "multiply", transformOrigin: "315px 82px" }} 
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.9 }}
            />
          </motion.g>

          {/* th group */}
          <motion.g variants={groupVariants} style={{ transformOrigin: "400px 65px" }}>
            <text x="360" y="80" className="font-bold text-[55px] select-none font-sans" fill="var(--color-text-primary)">th</text>
          </motion.g>
        </motion.g>
      </g>
    </svg>
  );
};

export const FooterBackgroundGradient = () => {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(125% 125% at 50% 10%, rgba(255, 255, 255, 0) 50%, rgba(184, 146, 74, 0.06) 100%)",
      }}
    />
  );
};
