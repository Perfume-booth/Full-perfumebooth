"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedCreditCard = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="1" y="4" width="22" height="16" rx="2" ry="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="1" y1="10" x2="23" y2="10" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
