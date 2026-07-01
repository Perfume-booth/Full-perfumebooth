"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedImage = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="3" y="3" width="18" height="18" rx="2" ry="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="8.5" cy="8.5" r="1.5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="21 15 16 10 5 21" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
