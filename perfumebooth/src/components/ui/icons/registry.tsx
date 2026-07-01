"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconWrapper, IconProps, pathVariants } from "./icon-wrapper";

export const AnimatedAlertCircle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="12" cy="12" r="10" variants={pathVariants.draw} initial="initial" animate={controls} />
        <motion.line x1="12" y1="8" x2="12" y2="12" variants={pathVariants.draw} initial="initial" animate={controls} />
        <motion.line x1="12" y1="16" x2="12.01" y2="16" variants={pathVariants.draw} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

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

export const AnimatedAnchor = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M12 22V8" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M5 12H2a10 10 0 0 0 20 0h-3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="12" cy="5" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedArrowLeft = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M19 12H5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m12 19-7-7 7-7" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedArrowRight = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M5 12h14" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m12 5 7 7-7 7" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedAward = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="12" cy="8" r="6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M15.477 12.89 17 21.416a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedBadgePercent = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="15" y1="9" x2="9" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="10" cy="9" r="1" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="14" cy="15" r="1" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedBanknote = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect width="20" height="12" x="2" y="6" rx="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="12" cy="12" r="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M6 12h.01M18 12h.01" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedCalendarDays = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect width="18" height="18" x="3" y="4" rx="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="16" y1="2" x2="16" y2="6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="8" y1="2" x2="8" y2="6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="3" y1="10" x2="21" y2="10" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedCheck = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M20 6L9 17l-5-5" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedCheckCircle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="22 4 12 14.01 9 11.01" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedCheckCircle2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m9 12 2 2 4-4" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedChevronDown = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="m6 9 6 6 6-6" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedChevronLeft = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="m15 18-6-6 6-6" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedChevronRight = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="m9 18 6-6-6-6" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedChevronUp = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="m18 15-6-6-6 6" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedClock = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="12" cy="12" r="10" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="12 6 12 12 16 14" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedCloudRain = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M16 14v6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M8 14v6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M12 16v6" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedCreditCard = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="1" y="4" width="22" height="16" rx="2" ry="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="1" y1="10" x2="23" y2="10" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedEdit2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedEye = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="12" cy="12" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedFacebook = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedFilter = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedGift = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.polyline points="20 12 20 22 4 22 4 12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.rect x="2" y="7" width="20" height="5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="22" x2="12" y2="7" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedGitCompare = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="18" cy="18" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="6" cy="6" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M13 6h3a2 2 0 0 1 2 2v7" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M11 18H8a2 2 0 0 1-2-2V9" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedGrid3X3 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect width="18" height="18" x="3" y="3" rx="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M3 9h18" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M3 15h18" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M9 3v18" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M15 3v18" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedHeart = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        variants={pathVariants.hover}
        initial="initial"
        animate={controls}
      />
    )}
  </IconWrapper>
);

export const AnimatedHelpCircle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="12" cy="12" r="10" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="17" x2="12.01" y2="17" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedIndianRupee = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M6 3h12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M6 8h12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m6 13 8.5 8" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M6 13h3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M9 13c6.667 0 6.667-10 0-10" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedInstagram = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="2" y="2" width="20" height="20" rx="5" ry="5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="17.5" y1="6.5" x2="17.51" y2="6.5" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedLandmark = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.line x1="3" y1="22" x2="21" y2="22" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="6" y1="18" x2="6" y2="11" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="10" y1="18" x2="10" y2="11" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="14" y1="18" x2="14" y2="11" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="18" y1="18" x2="18" y2="11" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="3 11 12 2 21 11" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

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

export const AnimatedLock = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="3" y="11" width="18" height="11" rx="2" ry="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M7 11V7a5 5 0 0 1 10 0v4" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedLogOut = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="16 17 21 12 16 7" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="21" y1="12" x2="9" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedMail = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect width="20" height="16" x="2" y="4" rx="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedMapPin = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="12" cy="10" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedMaximize = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M8 3H5a2 2 0 0 0-2 2v3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M21 8V5a2 2 0 0 0-2-2h-3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M3 16v3a2 2 0 0 0 2 2h3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M16 21h3a2 2 0 0 0 2-2v-3" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedMenu = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.line x1="4" y1="12" x2="20" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="4" y1="6" x2="20" y2="6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="4" y1="18" x2="20" y2="18" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedMessageCircle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedMessageSquare = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedMinus = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.line x1="5" y1="12" x2="19" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedMoveRight = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M18 8L22 12L18 16" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M2 12H22" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedPackage = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M16.5 9.4 7.5 4.21" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="3.27 6.96 12 12.01 20.73 6.96" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="22.08" x2="12" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedPackageCheck = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="m16 16 2 2 4-4" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m7.5 4.27 9 5.15" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="3.29 7 12 12 20.71 7" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="22.08" x2="12" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedPartyPopper = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M4 22L9 17" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M10 16L20 6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M15 11l4.5 4.5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m4 4 2 2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m20 20-2-2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m4 20 2-2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m20 4-2 2" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedPause = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect width="4" height="16" x="6" y="4" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.rect width="4" height="16" x="14" y="4" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedPhone = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        variants={pathVariants.hover}
        initial="initial"
        animate={controls}
      />
    )}
  </IconWrapper>
);

export const AnimatedPlay = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="m7 4 12 8-12 8V4z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedPlus = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.line x1="12" y1="5" x2="12" y2="19" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="5" y1="12" x2="19" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedRefreshCw = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M21 3v5h-5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M3 21v-5h5" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedRotateCcw = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M3 3v5h5" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedSearch = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="11" cy="11" r="8" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="21" y1="21" x2="16.65" y2="16.65" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedShare2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="18" cy="5" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="6" cy="12" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="18" cy="19" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="8.59" y1="13.51" x2="15.42" y2="17.49" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="15.41" y1="6.51" x2="8.59" y2="10.49" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedShield = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" variants={pathVariants.hover} initial="initial" animate={controls} />
    )}
  </IconWrapper>
);

export const AnimatedShieldCheck = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="m9 12 2 2 4-4" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedShoppingBag = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path
          d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M3 6h18"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M16 10a4 4 0 0 1-8 0"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
      </>
    )}
  </IconWrapper>
);

export const AnimatedShoppingCart = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="8" cy="21" r="1" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="19" cy="21" r="1" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path
          d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
      </>
    )}
  </IconWrapper>
);

export const AnimatedSlidersHorizontal = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.line x1="21" y1="4" x2="14" y2="4" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="10" y1="4" x2="3" y2="4" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="21" y1="12" x2="12" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="8" y1="12" x2="3" y2="12" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="21" y1="20" x2="16" y2="20" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="20" x2="3" y2="20" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="14" y1="2" x2="14" y2="6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="8" y1="10" x2="8" y2="14" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="16" y1="18" x2="16" y2="22" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedSmartphone = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="5" y="2" width="14" height="20" rx="2" ry="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="12" y1="18" x2="12.01" y2="18" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedStar = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        variants={pathVariants.hover}
        initial="initial"
        animate={controls}
      />
    )}
  </IconWrapper>
);

export const AnimatedTag = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="7" y1="7" x2="7.01" y2="7" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedTrash2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M3 6h18" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="10" y1="11" x2="10" y2="17" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="14" y1="11" x2="14" y2="17" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedTruck = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M15 18H9" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-4" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="7" cy="18" r="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="17" cy="18" r="2" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

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



export const AnimatedUser = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle
          cx="12" cy="7" r="4"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
      </>
    )}
  </IconWrapper>
);

export const AnimatedUsers = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="9" cy="7" r="4" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M22 21v-2a4 4 0 0 0-3-3.87" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M16 3.13a4 4 0 0 1 0 7.75" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedVolume2 = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M11 5L6 9H2v6h4l5 4V5z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M15.54 8.46a5 5 0 0 1 0 7.07" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M19.07 4.93a10 10 0 0 1 0 14.14" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedVolumeX = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M11 5L6 9H2v6h4l5 4V5z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="22" y1="9" x2="16" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="16" y1="9" x2="22" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedWallet = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M16 12h5" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedWind = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M9.6 4.6A2 2 0 1 1 11 8H2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.path d="M12.6 19.4A2 2 0 1 0 14 16H2" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedX = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path
          d="M18 6 6 18"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="m6 6 12 12"
          variants={pathVariants.hover}
          initial="initial"
          animate={controls}
        />
      </>
    )}
  </IconWrapper>
);

export const AnimatedXCircle = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.circle cx="12" cy="12" r="10" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="15" y1="9" x2="9" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.line x1="9" y1="9" x2="15" y2="15" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedYoutube = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);
export const AnimatedCamera = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="12" cy="13" r="3" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedImage = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <>
        <motion.rect x="3" y="3" width="18" height="18" rx="2" ry="2" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.circle cx="8.5" cy="8.5" r="1.5" variants={pathVariants.hover} initial="initial" animate={controls} />
        <motion.polyline points="21 15 16 10 5 21" variants={pathVariants.hover} initial="initial" animate={controls} />
      </>
    )}
  </IconWrapper>
);

export const AnimatedPinterest = (props: IconProps) => (
  <IconWrapper {...props}>
    {(controls) => (
      <motion.path
        d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"
        variants={pathVariants.hover}
        initial="initial"
        animate={controls}
      />
    )}
  </IconWrapper>
);
