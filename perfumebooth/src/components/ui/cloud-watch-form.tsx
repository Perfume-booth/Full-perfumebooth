"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, registerAction, forgotPasswordAction } from "@/lib/actions/auth";
import { AnimatedLoader2 as Loader2 } from "@/components/ui/icons/AnimatedLoader2";
import { AnimatedAlertCircle as AlertCircle } from "@/components/ui/icons/AnimatedAlertCircle";
import { AnimatedCheckCircle2 as CheckCircle2 } from "@/components/ui/icons/AnimatedCheckCircle2";
import { useRouter } from "next/navigation";

interface CloudWatchFormProps {
  type?: "signin" | "signup" | "forgot";
  returnUrl?: string;
  onModeChange?: (mode: "signin" | "signup" | "forgot") => void;
}

export default function CloudWatchForm({ type = "signup", returnUrl = "/", onModeChange }: CloudWatchFormProps) {
  const router = useRouter();
  const [isTyping, setIsTyping] = useState(false);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(type);

  const handleModeChange = (newMode: "signin" | "signup" | "forgot") => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  useEffect(() => {
    setMode(type);
  }, [type]);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const offsetX = ((e.clientX / window.innerWidth) - 0.5) * 40;
      const offsetY = ((e.clientY / window.innerHeight) - 0.5) * 20;
      setEyePos({ x: offsetX, y: offsetY });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     setLoading(true);
     setError(null);
     setSuccess(null);

     const formData = new FormData(e.currentTarget);
     
     // Handle full name for Shopify (firstName / lastName)
     if (mode === "signup") {
        const fullName = formData.get("name") as string;
        const [firstName, ...lastNames] = fullName.split(" ");
        formData.set("firstName", firstName || "");
        formData.set("lastName", lastNames.join(" ") || "Customer");
     }

     let result: { error?: string; success?: string | boolean; redirectUrl?: string } | undefined;
     if (mode === "signup") {
        result = await registerAction(null, formData);
     } else if (mode === "signin") {
        result = await loginAction(null, formData);
     } else {
        result = await forgotPasswordAction(null, formData);
     }

     if (result?.error) {
        setError(result.error);
        setLoading(false);
     } else if (result?.success) {
        if (mode === "forgot" && typeof result.success === "string") {
          setSuccess(result.success);
          handleModeChange("signin");
          setLoading(false);
        } else {
          // Use window.location.href for a full refresh to ensure all layouts re-render with fresh cookies
          window.location.href = result.redirectUrl || "/";
        }
     }
  };

  return (
    <div className="flex items-center justify-center">
      <div className=" flex flex-col items-center w-full max-w-md ">
      <h2 className="font-serif text-2xl text-[var(--color-maroon)] font-bold text-center">
          {mode === "signup" ? "Create Account" : mode === "signin" ? "Welcome Back" : "Recover Password"}
        </h2>
        {mode === "forgot" && (
          <p className="text-xs text-[var(--color-text-muted)] text-center max-w-xs mt-2 mb-1 leading-relaxed">
            Lost your password? Please enter your email address. You will receive a link to create a new password via email.
          </p>
        )}
       
        {/* Cartoon Face */}
          <div className="relative w-64 h-32 mb-4">
            <Image
              src="https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/cloud.jpg"
              alt="Decorative cloud character"
              fill
              className="w-full h-full object-contain"
              sizes="256px"
            />

            {["left", "right"].map((side, idx) => (
              <div
                key={side}
                className="absolute flex justify-center items-end overflow-hidden"
                style={{
                  top: "45%",
                  left: idx === 0 ? "35%" : "55%",
                  width: 24,
                  height: isTyping
                    ? 3 // fully closed when typing password
                    : blink
                    ? 4 // temporary blink
                    : 28, // open eye
                  borderRadius: isTyping || blink ? "1px" : "50%",
                  backgroundColor: "white",
                  transform: "translateX(-50%)",
                  transition: "all 0.15s ease",
                }}
              >
                {!isTyping && (
                  <div
                    className="bg-[#1a1a1a]"
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      marginBottom: 2, 
                      transform: `translate(${eyePos.x * 0.4}px, ${eyePos.y * 0.2}px)`,
                      transition: "all 0.1s ease",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

       

        {error && (
          <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs">   
            <AlertCircle size={16} animateOn="view" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="w-full p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-600 text-xs">   
            <CheckCircle2 size={16} className="text-green-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input type="hidden" name="returnUrl" value={returnUrl} />
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">Full Name</Label>
              <Input name="name" id="name" placeholder="John Doe" required className="rounded-full px-5 h-11 border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all" />
            </div>
          )}
          
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">Email Address</Label>
            <Input name="email" id="email" type="email" placeholder="john@example.com" required className="rounded-full px-5 h-11 border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all" />
          </div>

          {mode !== "forgot" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">Password</Label>
                {mode === "signin" && (
                  <button 
                    type="button" 
                    onClick={() => handleModeChange("forgot")}
                    className="text-[10px] font-bold text-neutral-400 hover:text-[var(--color-gold)] uppercase tracking-widest transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <Input
                name="password"
                id="password"
                type="password"
                required
                placeholder="••••••••"
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="rounded-full px-5 h-11 border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all"
              />
            </div>
          )}

          <Button 
            disabled={loading}
            className="mt-4 w-full h-11 rounded-full bg-[var(--color-maroon)] hover:bg-[var(--color-black)] text-white hover:text-white font-bold tracking-widest uppercase text-xs transition-all duration-300 shadow-lg shadow-maroon/20"
          >
            {loading ? <Loader2 size={16} animateOn="view" className="animate-spin" /> : (mode === "signup" ? "Sign Up" : mode === "signin" ? "Sign In" : "Send Recovery Email")}
          </Button>

          {mode === "forgot" && (
            <button 
              type="button" 
              onClick={() => handleModeChange("signin")}
              className="mt-2 text-[10px] font-black text-center text-neutral-400 hover:text-[var(--color-gold)] uppercase tracking-widest transition-colors"
            >
              Back to Sign In
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
