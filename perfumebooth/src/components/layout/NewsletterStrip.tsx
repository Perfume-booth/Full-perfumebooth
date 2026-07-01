"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useNewsletterStore } from "@/store/useNewsletterStore";
import { AnimatedCheck } from "@/components/ui/icons/AnimatedCheck";

export default function NewsletterStrip({ isFooter = false }: { isFooter?: boolean }) {
    const { isSubscribed, hasOrders, setSubscribed } = useNewsletterStore();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        setIsLoggedIn(Cookies.get("isLoggedIn") === "true");
    }, []);

    // Prevent hydration mismatch by not rendering until mounted
    if (!isMounted) {
        if (isFooter) return null;
        return <div className="h-24 bg-gradient-to-r from-[var(--color-maroon)] to-[#a01428]" />;
    }

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setError("");
 
        try {
            const response = await fetch("/api/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSubscribed(true);
                setEmail("");
            } else {
                setError(data.error || "Subscription failed. Please try again.");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (isLoggedIn && hasOrders) return null;

    return !isSubscribed ? (
        <div className={isFooter ? "w-full" : "bg-gradient-to-r from-[var(--color-maroon)] to-[#a01428]"}>
            <div className={isFooter ? "flex flex-col gap-3" : "max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4"}>
                <div className={isFooter ? "" : ""}>
                    <p className={`font-serif text-sm font-bold uppercase tracking-wider ${isFooter ? "text-[var(--color-gold)]" : "text-white text-xl"}`}>Subscribe to our Newsletter</p>
                    <p className={`text-xs ${isFooter ? "text-[var(--color-text-muted)] mt-1" : "text-white/60"}`}>Subscribe to our newsletter for Exclusive deals & fragrance tips</p>
                </div>
                <div className="w-full space-y-2">
                    <form onSubmit={handleSubscribe} className="flex gap-2 w-full">
                        <input
                            type="email"
                            required
                            placeholder="Enter your email..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            suppressHydrationWarning
                            className={`flex-1 min-w-0 px-4 py-2 rounded-full text-xs focus:outline-none transition-colors ${
                                isFooter 
                                    ? "bg-white/5 border border-[#d1c5b3]/30 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-gold)]" 
                                    : "bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/60"
                            }`}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            suppressHydrationWarning
                            className={`${loading ? 'opacity-50 cursor-not-allowed' : ''} ${
                                isFooter
                                    ? "bg-[var(--color-maroon)] text-white hover:bg-[var(--color-gold)] px-4 py-2 text-xs"
                                    : "bg-white text-[var(--color-maroon)] hover:bg-[var(--color-gold)] hover:text-white px-5 py-2.5 text-sm"
                            } font-bold rounded-full transition-colors duration-300 flex-shrink-0 min-w-[90px]`}
                        >
                            {loading ? '...' : 'Subscribe'}
                        </button>
                    </form>
                    {error && <p className="text-[10px] text-red-500 font-medium ml-2">{error}</p>}
                </div>
            </div>
        </div>
    ) : (
        <div className={isFooter ? "w-full py-3 bg-green-950/20 border border-green-500/20 rounded-2xl px-4" : "bg-green-900/40 py-3 border-b border-green-500/20"}>
            <div className={`flex items-center gap-3 text-xs text-green-400 ${isFooter ? "w-full" : "max-w-7xl mx-auto px-4 justify-center"}`}>
                <AnimatedCheck size={14} animateOn="view" />
                <span>Thank you for subscribing to our newsletter!</span>
            </div>
        </div>
    );
}
