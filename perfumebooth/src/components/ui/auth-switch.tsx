"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CloudWatchForm from "./cloud-watch-form";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthSwitch() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signup");
  const [returnUrl, setReturnUrl] = useState("/");
 
  // Sync state with URL if it changes (safely on the client post-hydration)
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signin" || urlMode === "signup" || urlMode === "forgot") {
      setMode(urlMode);
    } else {
      setMode("signup");
    }

    const urlReturn = searchParams.get("returnUrl");
    if (urlReturn) {
      setReturnUrl(urlReturn);
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto py-2">
      
      {/* Premium Segmented Switcher - Removed as requested */}

      {/* Auth Container with Morphing height */}
      <div className="relative w-full  p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === "signin" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "signin" ? 20 : -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CloudWatchForm type={mode} returnUrl={returnUrl} onModeChange={(newMode) => setMode(newMode)} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 text-center border-t border-[var(--color-border)] pt-6 w-full max-w-[200px] mx-auto">
        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest leading-relaxed">
          The Niche Circle
        </p>
      </div>
    </div>
  );
}
