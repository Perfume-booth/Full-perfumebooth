"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedVolumeX = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M11 5L6 9H2v6h4l5 4V5z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="22" y1="9" x2="16" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="16" y1="9" x2="22" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
