"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedMapPin = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="12" cy="10" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
