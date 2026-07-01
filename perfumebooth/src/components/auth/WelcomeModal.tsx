"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedX as X } from "@/components/ui/icons/AnimatedX";
import { AnimatedArrowRight as MoveRight } from "@/components/ui/icons/AnimatedArrowRight";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";

export default function WelcomeModal() {
  const { hasVisited, setHasVisited } = useAuthStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasVisited) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 3000); // Show after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [hasVisited]);

  const handleClose = () => {
    setShow(false);
    setHasVisited(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-white p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-[#e8e3de] overflow-hidden group rounded-sm"
          >
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#7b0d1e]/5 rounded-full -mr-24 -mt-24 blur-3xl" />
            
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 text-[#1a1410]/40 hover:text-[#7b0d1e] transition-colors z-10"
              aria-label="Close modal"
            >
              <X size={20} animateOn="hover" />
            </button>

            <div className="relative z-10 text-center">
              <span className="font-sans text-[10px] uppercase tracking-[0.4em] text-[#7b0d1e] font-semibold mb-6 block">
                The Scent Journey Awaits
              </span>
              <h2 className="font-serif text-4xl md:text-5xl font-light italic text-[#1a1410] mb-6 leading-tight">
                Welcome to <br /> Perfume Booth
              </h2>
              <p className="font-sans text-[13px] text-[#4a4038] leading-relaxed mb-10 max-w-[320px] mx-auto">
                Join our curatorial circle for Exclusive  access to rare fragrances, personalized scent profiles, and priority shipping.
              </p>

              <div className="flex flex-col gap-4 max-w-xs mx-auto">
                <Link
                  href="/auth?mode=signin"
                  onClick={handleClose}
                  className="w-full bg-[#7b0d1e] text-white py-4 flex items-center justify-center gap-3 font-sans text-[11px] uppercase tracking-[0.3em] hover:bg-[#a01428] transition-all group shadow-lg shadow-[#7b0d1e]/20"
                >
                  Sign In
                  <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" animateOn="hover" />
                </Link>
                <Link
                  href="/auth?mode=signup"
                  onClick={handleClose}
                  className="w-full border border-[#1a1410]/10 text-[#1a1410] py-4 flex items-center justify-center gap-3 font-sans text-[11px] uppercase tracking-[0.3em] hover:bg-[#1a1410]/5 transition-all"
                >
                  Create Account
                </Link>
              </div>

              <button
                onClick={handleClose}
                className="mt-10 font-sans text-[10px] uppercase tracking-[0.2em] text-[#1a1410]/40 hover:text-[#7b0d1e] transition-colors underline underline-offset-8 decoration-transparent hover:decoration-current"
              >
                Continue as Guest
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
