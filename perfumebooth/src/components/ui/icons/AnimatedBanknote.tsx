"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedBanknote = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect width="20" height="12" x="2" y="6" rx="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="12" cy="12" r="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M6 12h.01M18 12h.01" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
