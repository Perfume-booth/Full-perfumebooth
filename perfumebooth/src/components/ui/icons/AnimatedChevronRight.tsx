"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedChevronRight = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="m9 18 6-6-6-6" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);
