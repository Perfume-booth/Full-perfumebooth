"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedTrash2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M3 6h18" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="10" y1="11" x2="10" y2="17" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="14" y1="11" x2="14" y2="17" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
