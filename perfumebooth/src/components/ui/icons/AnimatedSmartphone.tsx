"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedSmartphone = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="5" y="2" width="14" height="20" rx="2" ry="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="18" x2="12.01" y2="18" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
