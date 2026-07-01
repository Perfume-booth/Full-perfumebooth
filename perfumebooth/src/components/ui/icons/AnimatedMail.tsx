"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedMail = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect width="20" height="16" x="2" y="4" rx="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
