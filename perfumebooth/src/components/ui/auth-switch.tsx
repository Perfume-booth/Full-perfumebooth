"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
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
      
      {/* Premium Segmented Switcher - Hidden in forgot mode */}
      {mode !== "forgot" && (
        <div className="relative flex p-1 bg-[var(--color-bg-subtle)] rounded-full mb-8 border border-[var(--color-border)] w-fit mx-auto shadow-inner">
          <div 
            className="absolute h-[calc(100%-8px)] rounded-full bg-[var(--color-maroon)] shadow-lg transition-all duration-300 ease-out"
            style={{ 
              left: mode === "signin" ? "4px" : "110px",
              width: mode === "signin" ? "100px" : "130px"
            }}
          />
          <button
            onClick={() => setMode("signin")}
            className={cn(
              "relative z-10 px-6 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors duration-300 w-[100px]",
              mode === "signin" ? "text-white" : "text-[var(--color-text-muted)] hover:text-white"
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={cn(
              "relative z-10 px-6 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors duration-300 w-[130px]",
              mode === "signup" ? "text-white" : "text-[var(--color-text-muted)] hover:text-white"
            )}
          >
            Create Account
          </button>
        </div>
      )}

      {/* Forms Container with Animation */}
      <div className="w-full">
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
