"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedShoppingCart = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="8" cy="21" r="1" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="19" cy="21" r="1" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path
          d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
      </>
    )}
  </IconWrapper>
);
