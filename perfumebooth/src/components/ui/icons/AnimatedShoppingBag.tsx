"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedShoppingBag = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path
          d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M3 6h18"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M16 10a4 4 0 0 1-8 0"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
      </>
    )}
  </IconWrapper>
);
