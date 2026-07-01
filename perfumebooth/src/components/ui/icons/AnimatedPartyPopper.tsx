"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedPartyPopper = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M4 22L9 17" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M10 16L20 6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M15 11l4.5 4.5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m4 4 2 2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m20 20-2-2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m4 20 2-2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m20 4-2 2" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
