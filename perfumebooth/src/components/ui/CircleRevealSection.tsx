"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionTemplate } from "framer-motion";

interface CircleRevealSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  origin?: "arch" | "center" | "top";
}

export default function CircleRevealSection({
  children,
  className = "",
  id,
  origin = "arch",
}: CircleRevealSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll progress as section enters from bottom of viewport to near top
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "start 15%"],
  });

  // Smooth out scrolling steps for fluid momentum
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  // ── ARCH MODE (Exact MDE Beauty dome rising from bottom) ──
  // Left/Right inset percentage: starts at 38% (curved arch dome) and opens to 0% (full bleed)
  const insetX = useTransform(smoothProgress, [0, 0.85], [38, 0]);
  // Top corner radii in px: starts at 9999px (CSS automatically clamps to perfect circular dome),
  // then flattens to 0px as the arch meets the viewport edges
  const radius = useTransform(smoothProgress, [0, 0.6, 0.85], [9999, 350, 0]);
  const archClipPath = useMotionTemplate`inset(0% ${insetX}% 0% ${insetX}% round ${radius}px ${radius}px 0px 0px)`;

  // ── CENTER CIRCLE MODE (Expanding from center) ──
  const circleRadius = useTransform(smoothProgress, [0, 0.85], [8, 150]);
  const centerClipPath = useMotionTemplate`circle(${circleRadius}% at 50% 50%)`;

  const activeClipPath = origin === "center" ? centerClipPath : archClipPath;

  return (
    <div
      ref={containerRef}
      id={id}
      className={`relative w-full overflow-hidden [filter:drop-shadow(0_-15px_30px_rgba(0,0,0,0.08))] ${className}`}
    >
      {/* ── Scroll-driven Expanding Arch / Circle Container ── */}
      <motion.div
        style={{
          clipPath: activeClipPath,
          WebkitClipPath: activeClipPath,
        }}
        className="w-full h-full will-change-[clip-path]"
      >
        {children}
      </motion.div>
    </div>
  );
}
