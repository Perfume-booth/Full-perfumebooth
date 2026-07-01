"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedShare2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="18" cy="5" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="6" cy="12" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="18" cy="19" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="8.59" y1="13.51" x2="15.42" y2="17.49" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="15.41" y1="6.51" x2="8.59" y2="10.49" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
