"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedArrowRight = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M5 12h14" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m12 5 7 7-7 7" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
