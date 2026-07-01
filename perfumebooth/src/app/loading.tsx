"use client";

import { motion } from "framer-motion";
import PerfumeLogo from "@/components/ui/Logo";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#fdfcfb]">
      {/* Cinematic Loader Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3] 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-[#d4a96a] to-transparent blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-[#b8924a] to-transparent blur-[150px]"
        />
      </div>

      <div className="relative flex flex-col items-center w-full px-4">
        {/* Animated Brand Logo */}
        <div className="w-full max-w-[288px] h-32 mb-6 flex items-center justify-center scale-110 md:scale-125 mx-auto">
          <PerfumeLogo />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="font-serif text-3xl text-[#1a1410] tracking-wider font-light italic mb-3">
          Crafted Elegance
          </h2>
          <div className="flex flex-col items-center gap-3">
            <span className="w-12 h-px bg-gradient-to-r from-transparent via-[#b8924a] to-transparent" />
            <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-[#807667] font-bold">
              Fragrance Explorer
            </p>
          </div>
        </motion.div>
      </div>

      {/* Progress Line */}
      <div className="fixed bottom-0 left-0 w-full h-[2px] bg-[#faf7f2]">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="h-full bg-[#b8924a]"
        />
      </div>
    </div>
  );
}
