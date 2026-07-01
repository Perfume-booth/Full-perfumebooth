"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedGrid3X3 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect width="18" height="18" x="3" y="3" rx="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M3 9h18" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M3 15h18" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M9 3v18" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M15 3v18" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
