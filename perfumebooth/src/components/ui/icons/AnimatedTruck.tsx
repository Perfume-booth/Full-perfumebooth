"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedTruck = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M15 18H9" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-4" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="7" cy="18" r="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="17" cy="18" r="2" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
