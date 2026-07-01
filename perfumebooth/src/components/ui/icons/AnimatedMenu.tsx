"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedMenu = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.line x1="4" y1="12" x2="20" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="4" y1="6" x2="20" y2="6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="4" y1="18" x2="20" y2="18" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
