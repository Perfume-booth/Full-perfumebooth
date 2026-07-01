"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedBadgePercent = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="15" y1="9" x2="9" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="10" cy="9" r="1" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="14" cy="15" r="1" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
