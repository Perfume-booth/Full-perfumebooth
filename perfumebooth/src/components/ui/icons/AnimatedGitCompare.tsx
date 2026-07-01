"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedGitCompare = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="18" cy="18" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="6" cy="6" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M13 6h3a2 2 0 0 1 2 2v7" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M11 18H8a2 2 0 0 1-2-2V9" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
