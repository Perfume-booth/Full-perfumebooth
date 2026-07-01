"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { AnimatedChevronUp as ChevronUp } from "@/components/ui/icons/AnimatedChevronUp";

export default function BackToTop() {
  const scrollPosition = useScrollPosition();
  const showButton = scrollPosition > 800;

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {showButton && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-10 right-10 z-[60] hidden lg:flex h-12 w-12 items-center justify-center rounded-full bg-[#b8924a] text-white shadow-2xl transition-colors hover:bg-[#807667]"
          aria-label="Back to Top"
        >
          <ChevronUp size={24} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
