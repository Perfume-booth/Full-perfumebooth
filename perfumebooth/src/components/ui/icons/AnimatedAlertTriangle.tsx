"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedAlertTriangle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="9" x2="12" y2="13" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="17" x2="12.01" y2="17" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
