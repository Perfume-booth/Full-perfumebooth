"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedChevronLeft = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="m15 18-6-6 6-6" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);
