"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AnimatedPackage as PackageIcon } from "@/components/ui/icons/AnimatedPackage";
import { AnimatedArrowRight as ArrowRight } from "@/components/ui/icons/AnimatedArrowRight";

export default function TrackOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const orderIdParam = searchParams.get("orderId");
    const emailParam = searchParams.get("email");

    if (errorParam) setError(errorParam);
    if (orderIdParam) setOrderId(orderIdParam);
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = orderId.trim();
    const cleanEmail = email.trim();

    if (!cleanId) {
      setError("Please enter your Order ID");
      return;
    }

    // Accept both 1001 and #1001 formats
    const finalId = cleanId.startsWith("#") ? cleanId.substring(1) : cleanId;

    if (!/^[a-zA-Z0-9\-_%]+$/.test(finalId)) {
      setError("Please enter a valid Order ID");
      return;
    }

    if (!cleanEmail) {
      setError("Please enter the email address associated with the order");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    // Redirect to the order details page with email query param to bypass authentication check
    router.push(`/orders/${encodeURIComponent(finalId)}?email=${encodeURIComponent(cleanEmail)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      <div className="relative bg-white border border-[#ede8e0] rounded-2xl shadow-xl p-8 md:p-10 overflow-hidden">
        {/* Background Decorative Blur */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#b8924a]/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#7b0d1e]/5 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

        <div className="relative z-10 text-center flex flex-col items-center">
          {/* Animated Package Icon Container */}
          <div className="w-16 h-16 bg-[#faf7f2] border border-[#ede8e0] text-[#b8924a] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <PackageIcon size={28} animateOn="view" />
          </div>

          <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#b8924a] font-bold mb-2 block">
            Order Tracking
          </span>
          <h2 className="font-serif text-3xl font-light text-[#1a1410] mb-4">
            Track Your Purchase
          </h2>
          <p className="font-sans text-xs text-neutral-500 mb-8 max-w-[280px] leading-relaxed">
            Enter your order ID and the email address used during purchase to check your order status instantly without signing in.
          </p>

          <form onSubmit={handleSubmit} className="w-full text-left space-y-4">
            <div>
              <label 
                htmlFor="order-id-input" 
                className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-2"
              >
                Order ID / Number
              </label>
              
              <div className="relative flex items-center bg-[#fdfcfb] border border-[#ede8e0] focus-within:border-[#b8924a] focus-within:bg-white rounded-xl px-4 py-2.5 transition-all shadow-inner-sm">
                <span className="text-[#b8924a] font-bold text-sm mr-2 select-none">#</span>
                <input
                  id="order-id-input"
                  type="text"
                  placeholder="e.g. 1001"
                  value={orderId}
                  onChange={(e) => {
                    setOrderId(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                  className="w-full bg-transparent border-none text-[13px] text-gray-700 focus:outline-none placeholder:text-gray-400 font-medium h-7"
                />
              </div>
            </div>

            <div>
              <label 
                htmlFor="email-input" 
                className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-2"
              >
                Email Address
              </label>
              
              <div className="relative flex items-center bg-[#fdfcfb] border border-[#ede8e0] focus-within:border-[#b8924a] focus-within:bg-white rounded-xl px-4 py-2.5 transition-all shadow-inner-sm">
                <input
                  id="email-input"
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                  className="w-full bg-transparent border-none text-[13px] text-gray-700 focus:outline-none placeholder:text-gray-400 font-medium h-7"
                />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-[11px] mt-2 font-medium"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1410] text-white py-4 flex items-center justify-center gap-3 font-sans text-[11px] uppercase tracking-[0.3em] hover:bg-[#b8924a] transition-all duration-300 rounded-xl shadow-lg shadow-black/5 mt-6 cursor-pointer disabled:bg-neutral-300 disabled:cursor-not-allowed group"
            >
              {loading ? "Locating Order..." : "Track Order"}
              {!loading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="text-[10px] text-neutral-400 mt-6 leading-relaxed max-w-[280px]">
            Your personal information is verified securely. We only display tracking data when the order ID and email address match.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
