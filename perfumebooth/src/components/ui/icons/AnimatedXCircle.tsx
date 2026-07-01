"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedXCircle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="12" cy="12" r="10" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="15" y1="9" x2="9" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="9" y1="9" x2="15" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
