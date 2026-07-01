"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedCalendarDays = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect width="18" height="18" x="3" y="4" rx="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="16" y1="2" x2="16" y2="6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="8" y1="2" x2="8" y2="6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="3" y1="10" x2="21" y2="10" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
