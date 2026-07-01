"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedMoveRight = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M18 8L22 12L18 16" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M2 12H22" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
