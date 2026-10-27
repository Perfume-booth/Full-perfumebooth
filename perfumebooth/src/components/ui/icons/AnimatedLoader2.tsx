"use client";

import { motion } from "framer-motion";
import { IconWrapper, IconProps } from "./icon-wrapper";

export const AnimatedLoader2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path 
        d="M21 12a9 9 0 1 1-6.219-8.56" 
        variants={{
          hover: { rotate: 360, transition: { duration: 1, repeat: Infinity, ease: "linear" } },
          animate: { rotate: 360, transition: { duration: 1, repeat: Infinity, ease: "linear" } }
        }} 
        animate={controls} 
      />
    )}
  </IconWrapper>
);
