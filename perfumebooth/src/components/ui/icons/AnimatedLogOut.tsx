"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedLogOut = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="16 17 21 12 16 7" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="21" y1="12" x2="9" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
