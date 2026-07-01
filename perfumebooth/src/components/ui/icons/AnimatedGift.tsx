"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedGift = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.polyline points="20 12 20 22 4 22 4 12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.rect x="2" y="7" width="20" height="5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="22" x2="12" y2="7" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
