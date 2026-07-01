"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedAnchor = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M12 22V8" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M5 12H2a10 10 0 0 0 20 0h-3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="12" cy="5" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
