"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedShield = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);
