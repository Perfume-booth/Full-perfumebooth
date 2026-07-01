"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedInstagram = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="2" y="2" width="20" height="20" rx="5" ry="5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="17.5" y1="6.5" x2="17.51" y2="6.5" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
