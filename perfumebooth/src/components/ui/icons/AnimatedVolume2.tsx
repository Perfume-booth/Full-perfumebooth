"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedVolume2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M11 5L6 9H2v6h4l5 4V5z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M15.54 8.46a5 5 0 0 1 0 7.07" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M19.07 4.93a10 10 0 0 1 0 14.14" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
