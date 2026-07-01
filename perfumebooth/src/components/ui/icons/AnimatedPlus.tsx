"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedPlus = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.line x1="12" y1="5" x2="12" y2="19" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="5" y1="12" x2="19" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
