"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedMessageSquare = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);
