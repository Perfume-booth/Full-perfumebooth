"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedCloudRain = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M16 14v6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M8 14v6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M12 16v6" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
