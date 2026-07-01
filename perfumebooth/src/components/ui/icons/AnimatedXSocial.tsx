"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedXSocial = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path 
        d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" 
        variants={pathVariants.hover} 
        initial="initial" 
        animate={controls} 
      />
    )}
  </IconWrapper>
);
