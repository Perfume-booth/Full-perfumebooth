"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedRefreshCw = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M21 3v5h-5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M3 21v-5h5" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
