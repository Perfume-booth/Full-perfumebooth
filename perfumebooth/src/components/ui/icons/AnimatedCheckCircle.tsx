"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedCheckCircle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="22 4 12 14.01 9 11.01" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
