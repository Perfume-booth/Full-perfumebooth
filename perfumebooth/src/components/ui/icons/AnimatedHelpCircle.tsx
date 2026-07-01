"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedHelpCircle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="12" cy="12" r="10" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="17" x2="12.01" y2="17" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
