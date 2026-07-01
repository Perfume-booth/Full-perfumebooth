"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedLock = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="3" y="11" width="18" height="11" rx="2" ry="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M7 11V7a5 5 0 0 1 10 0v4" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
