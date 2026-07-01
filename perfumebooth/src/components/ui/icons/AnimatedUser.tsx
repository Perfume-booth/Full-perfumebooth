"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedUser = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle
          cx="12" cy="7" r="4"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
      </>
    )}
  </IconWrapper>
);
