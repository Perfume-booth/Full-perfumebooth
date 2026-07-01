"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedAlertCircle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="12" cy="12" r="10" variants={pathVariants.draw} initial="initial" animate={controls} />
        <motion.line x1="12" y1="8" x2="12" y2="12" variants={pathVariants.draw} initial="initial" animate={controls} />
        <motion.line x1="12" y1="16" x2="12.01" y2="16" variants={pathVariants.draw} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
