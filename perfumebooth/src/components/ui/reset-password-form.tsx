"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/lib/actions/auth";
import { AnimatedLoader2 as Loader2 } from "@/components/ui/icons/AnimatedLoader2";
import { AnimatedAlertCircle as AlertCircle } from "@/components/ui/icons/AnimatedAlertCircle";
import { AnimatedCheckCircle2 as CheckCircle2 } from "@/components/ui/icons/AnimatedCheckCircle2";

interface ResetPasswordFormProps {
  id: string;
  token: string;
}

export default function ResetPasswordForm({ id, token }: ResetPasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const result = await resetPasswordAction(null, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      setSuccess(result.success as string);
      setTimeout(() => {
        window.location.href = result?.redirectUrl || "/account";
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto py-12 px-4">
      <h2 className="font-serif text-3xl text-[var(--color-maroon)] font-bold text-center mb-2">
        Set New Password
      </h2>
      <p className="text-xs text-[var(--color-text-muted)] text-center mb-8 max-w-sm leading-relaxed">
        Please enter your new password below. Make sure it is at least 8 characters long.
      </p>

      {error && (
        <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs mb-4">   
          <AlertCircle size={16} animateOn="view" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="w-full p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-600 text-xs mb-4">   
          <CheckCircle2 size={16} className="text-green-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="token" value={token} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">New Password</Label>
          <Input 
            name="password" 
            id="password" 
            type="password" 
            placeholder="••••••••" 
            required 
            minLength={8}
            className="rounded-full px-5 h-11 border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all" 
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">Confirm New Password</Label>
          <Input 
            name="confirmPassword" 
            id="confirmPassword" 
            type="password" 
            placeholder="••••••••" 
            required 
            minLength={8}
            className="rounded-full px-5 h-11 border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all" 
          />
        </div>

        <Button 
          disabled={loading || !!success}
          className="mt-4 w-full h-11 rounded-full bg-[var(--color-maroon)] hover:bg-[var(--color-black)] font-bold tracking-widest uppercase text-xs transition-all duration-300 shadow-lg shadow-maroon/20"
        >
          {loading ? <Loader2 size={16} animateOn="view" className="animate-spin" /> : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}
