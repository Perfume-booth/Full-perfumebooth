"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedEdit2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);
