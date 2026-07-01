"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedChevronDown = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="m6 9 6 6 6-6" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);
