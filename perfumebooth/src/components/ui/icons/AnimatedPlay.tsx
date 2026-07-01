"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedPlay = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="m7 4 12 8-12 8V4z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);
