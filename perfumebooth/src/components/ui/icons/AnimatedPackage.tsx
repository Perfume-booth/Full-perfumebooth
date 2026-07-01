"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedPackage = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M16.5 9.4 7.5 4.21" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="3.27 6.96 12 12.01 20.73 6.96" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="22.08" x2="12" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
