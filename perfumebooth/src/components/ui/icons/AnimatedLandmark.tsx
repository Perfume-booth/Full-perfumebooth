"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedLandmark = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.line x1="3" y1="22" x2="21" y2="22" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="6" y1="18" x2="6" y2="11" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="10" y1="18" x2="10" y2="11" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="14" y1="18" x2="14" y2="11" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="18" y1="18" x2="18" y2="11" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="3 11 12 2 21 11" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
