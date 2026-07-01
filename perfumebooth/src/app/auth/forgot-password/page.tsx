"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { AnimatedMoveRight as MoveRight } from "@/components/ui/icons/AnimatedMoveRight";
import { AnimatedMail as Mail } from "@/components/ui/icons/AnimatedMail";
import { AnimatedArrowLeft as ArrowLeft } from "@/components/ui/icons/AnimatedArrowLeft";
import { forgotPasswordAction } from "@/lib/actions/auth";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, null);

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center pt-32 pb-20 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-10 md:p-14 shadow-xl border border-primary/5"
      >
        <div className="mb-10 text-left">
           <Link href="/auth" className="inline-flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-on-surface/40 hover:text-primary transition-colors mb-8 group">
             <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" animateOn="hover" />
             Back to Login
           </Link>
          <h1 className="font-serif text-4xl text-on-surface font-light italic mb-4">Cipher Recovery</h1>
          <p className="font-sans text-[11px] text-on-surface/50 leading-relaxed">
            Enter your email identity below to receive a restoration link for your scent archive access.
          </p>
        </div>

        {state?.error && (
          <div className="mb-8 p-4 bg-red-50 text-red-700 text-[11px] font-sans uppercase tracking-wider text-center border border-red-100">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="mb-8 p-4 bg-green-50 text-green-700 text-[11px] font-sans uppercase tracking-wider text-center border border-green-100 italic">
            {state.success}
          </div>
        )}

        {!state?.success && (
          <form action={formAction} className="space-y-8">
            <div className="space-y-3">
              <label className="font-sans text-[10px] uppercase tracking-[0.2em] text-on-surface/40" htmlFor="email">
                Registered Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-primary transition-colors" size={14} animateOn="hover" />
                <input 
                  id="email"
                  name="email"
                  type="email" 
                  className="w-full bg-transparent border-b border-on-surface/10 py-3 pl-7 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                  placeholder="curator@perfume.com"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isPending}
              className="w-full bg-primary text-surface px-8 py-5 font-sans text-[11px] uppercase tracking-[0.3em] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-4 group mt-12"
            >
              {isPending ? "Connecting to Archive..." : "Request Recovery"}
              {!isPending && <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" animateOn="hover" />}
            </button>
          </form>
        )}

        <div className="mt-16 text-center border-t border-on-surface/5 pt-10">
          <p className="font-sans text-[11px] text-on-surface/40 mb-4">
            Need direct curatorial assistance?
          </p>
          <Link 
            href="/info/contact-us" 
            className="inline-block font-sans text-[11px] uppercase tracking-[0.3em] text-primary hover:opacity-70 transition-opacity border-b border-primary/20 pb-1"
          >
            Contact Master Distiller
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
