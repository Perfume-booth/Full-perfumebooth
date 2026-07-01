"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedMaximize = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M8 3H5a2 2 0 0 0-2 2v3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M21 8V5a2 2 0 0 0-2-2h-3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M3 16v3a2 2 0 0 0 2 2h3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M16 21h3a2 2 0 0 0 2-2v-3" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
