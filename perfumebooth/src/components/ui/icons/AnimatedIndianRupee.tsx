"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedIndianRupee = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M6 3h12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M6 8h12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m6 13 8.5 8" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M6 13h3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M9 13c6.667 0 6.667-10 0-10" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
