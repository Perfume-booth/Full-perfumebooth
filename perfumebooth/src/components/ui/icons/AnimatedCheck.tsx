"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedCheck = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M20 6L9 17l-5-5" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);
