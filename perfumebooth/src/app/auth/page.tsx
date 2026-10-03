"use client";
 
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatedArrowLeft as ArrowLeft } from "@/components/ui/icons/AnimatedArrowLeft";
import { AnimatedShieldCheck as ShieldCheck } from "@/components/ui/icons/AnimatedShieldCheck";
import { AnimatedHeart as Heart } from "@/components/ui/icons/AnimatedHeart";
import AuthSwitch from "@/components/ui/auth-switch";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense } from "react";
import Image from "next/image";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signup") {
      setMode("signup");
    } else {
      setMode("signin");
    }
  }, [searchParams]);

  const content = {
    signin: {
      image: "/images/fallback-luxury.svg",
      pill: "The Curatorial Circle",
      title: (
        <>
          Discover Your <br />
          <span className="text-[var(--color-gold)] italic font-normal">Signature</span> <br />
          Scent
        </>
      ),
      description: "Securely access your curatorial collection and explore our latest architectural arrivals.",
      icon: ShieldCheck,
      feature: "Authored Verification"
    },
    signup: {
      image: "/images/fallback-luxury.svg",
      pill: "Join the Essence",
      title: (
        <>
          Begin Your <br />
          <span className="text-[var(--color-gold)] italic font-normal">Scented</span> <br />
          Journey
        </>
      ),
      description: "Membership is an invitation to explore fragrance as high art. Join our community of niche enthusiasts.",
      icon: Heart,
      feature: "Exclusive  Access"
    }
  };

  const active = content[mode];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col pt-20 md:pt-32 relative overflow-hidden selection:bg-[var(--color-gold)]/30">
      
      {/* Absolute Header Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8 z-30"
      >
        <Link 
          href="/" 
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors group px-5 py-2.5 bg-white/5 backdrop-blur-xl rounded-full border border-white/5 hover:border-white/20 shadow-xl"
        >
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" animateOn="hover" />
          Navigate to Home
        </Link>
      </motion.div>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl bg-white rounded-3xl lg:rounded-[40px] shadow-[0_40px_120px_-15px_rgba(0,0,0,0.2)] overflow-hidden border border-white/10 flex flex-col md:flex-row relative group/card"
        >
          
          {/* Left Panel: Dynamic Visual Context */}
          <div className="hidden md:flex w-1/2 relative min-h-[650px] overflow-hidden bg-[var(--color-maroon)]">
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={mode}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="absolute inset-0 z-0"
              >
                <Image 
                  src={active.image}
                  alt="Perfume Booth"
                  fill
                  priority
                  className="w-full h-full object-cover grayscale-[0.1] brightness-75 contrast-[1.05]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                
                {/* Brand Overlay Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-maroon)] via-[var(--color-maroon)]/20 to-transparent" />
                <div className="absolute inset-0 bg-black/30" />
              </motion.div>
            </AnimatePresence>
            
            {/* Artistic Texture */}
            <div className="absolute inset-0 z-10 opacity-[0.05] pointer-events-none bg-[url('/noise.svg')] mix-blend-overlay" />

            {/* Editorial Content */}
            <div className="relative z-20 w-full p-12 lg:p-16 flex flex-col justify-between text-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center gap-4 mb-10 overflow-hidden">
                    <div className="h-[1px] w-12 bg-[var(--color-gold)]" />
                    <span className="text-[10px] uppercase tracking-[0.6em] text-[var(--color-gold)] font-bold">{active.pill}</span>
                  </div>
                  
                  <h1 className="font-serif text-5xl lg:text-6xl font-light leading-[1.1] mb-8 tracking-tight">
                    {active.title}
                  </h1>
                  
                  <p className="text-white/80 text-[14px] leading-relaxed max-w-sm tracking-wide font-sans mb-12 drop-shadow-sm">
                    {active.description}
                  </p>

                  <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center gap-5 hover:bg-white/10 transition-all duration-500 cursor-default">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center text-[var(--color-gold)]">
                      <active.icon size={18} animateOn="view" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#f5f1ed]">{active.feature}</h3>
                      <p className="text-[10px] text-white/40 tracking-wide mt-1">Authentic curation for connoisseurs.</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center gap-4 opacity-40">
                <span className="text-[9px] uppercase tracking-[2px] font-bold">Privacy Secured</span>
                <span className="w-1 h-1 rounded-full bg-white" />
                <span className="text-[9px] uppercase tracking-[2px] font-bold">100% Genuine</span>
              </div>
            </div>
          </div>

          {/* Right Panel: The Boutique Interface */}
          <div className="w-full md:w-1/2 p-8 lg:p-20 flex flex-col justify-center bg-white relative">
             <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.4 }}
               className="relative z-10"
             >
                <AuthSwitch />
             </motion.div>
             
             {/* Subtle Right Texture */}
             <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('/noise.svg')]" />
          </div>

        </motion.div>
      </main>

      {/* Atmospheric Background glow */}
      <div className="absolute -top-64 -right-64 w-[600px] h-[600px] bg-[var(--color-gold)]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-64 -left-64 w-[600px] h-[600px] bg-[var(--color-maroon)]/5 rounded-full blur-[150px] pointer-events-none" />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}

