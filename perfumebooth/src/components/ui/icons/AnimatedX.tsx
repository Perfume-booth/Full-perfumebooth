"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedX = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path
          d="M18 6 6 18"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="m6 6 12 12"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
      </>
    )}
  </IconWrapper>
);
