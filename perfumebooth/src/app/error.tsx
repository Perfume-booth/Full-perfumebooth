"use client";
import { useEffect } from "react";
import { AnimatedAlertCircle } from "@/components/ui/icons/AnimatedAlertCircle";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      <AnimatedAlertCircle size={48} className="text-[var(--color-maroon)] mb-6 opacity-80" animateOn="view" />
      <h2 className="font-serif text-3xl text-[var(--color-text-primary)] tracking-wide font-light mb-4">
        Something went wrong
      </h2>
      <p className="font-sans text-[13px] text-[var(--color-text-secondary)] max-w-md mx-auto mb-8">
        We apologize, but there was an error processing your request. Please try reloading the page or contact support if the issue persists.
      </p>
      
      <button
        onClick={() => reset()}
        className="inline-block border border-[var(--color-gold)] text-[var(--color-text-primary)] px-8 py-3 font-sans text-[11px] uppercase tracking-[0.2em] hover:bg-[var(--color-gold)] hover:text-white transition-all duration-300"
      >
        Try again
      </button>
    </div>
  );
}
