"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedFilter = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);
