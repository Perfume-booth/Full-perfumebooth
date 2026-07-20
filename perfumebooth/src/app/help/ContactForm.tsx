"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Sending your inquiry...");

    try {
      // 1. Submit to Resend backend API
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, phone, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit form.");
      }

      toast.success("Thank you! Inquiry submitted successfully.", { id: toastId });

      // Reset form fields
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong. Please try again.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl w-full flex flex-col gap-10">
      {/* Modern Minimal Inputs */}
      <div className="relative">
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder=" "
          required
          disabled={loading}
          className="block w-full pt-4 pb-2 text-sm text-[var(--color-text-primary)] bg-transparent border-0 border-b border-[var(--color-border)] appearance-none focus:outline-none focus:ring-0 focus:border-[var(--color-gold)] peer transition-colors disabled:opacity-50"
        />
        <label
          htmlFor="name"
          className="absolute text-sm text-[var(--color-text-muted)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[var(--color-gold)]"
        >
          Your Full Name *
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="relative">
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=" "
            required
            disabled={loading}
            className="block w-full pt-4 pb-2 text-sm text-[var(--color-text-primary)] bg-transparent border-0 border-b border-[var(--color-border)] appearance-none focus:outline-none focus:ring-0 focus:border-[var(--color-gold)] peer transition-colors disabled:opacity-50"
          />
          <label
            htmlFor="email"
            className="absolute text-sm text-[var(--color-text-muted)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[var(--color-gold)]"
          >
            Email Address *
          </label>
        </div>

        <div className="relative">
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder=" "
            disabled={loading}
            className="block w-full pt-4 pb-2 text-sm text-[var(--color-text-primary)] bg-transparent border-0 border-b border-[var(--color-border)] appearance-none focus:outline-none focus:ring-0 focus:border-[var(--color-gold)] peer transition-colors disabled:opacity-50"
          />
          <label
            htmlFor="phone"
            className="absolute text-sm text-[var(--color-text-muted)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[var(--color-gold)]"
          >
            Phone Number
          </label>
        </div>
      </div>

      <div className="relative mt-2">
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          placeholder=" "
          disabled={loading}
          className="block w-full pt-4 pb-2 text-sm text-[var(--color-text-primary)] bg-transparent border-0 border-b border-[var(--color-border)] appearance-none focus:outline-none focus:ring-0 focus:border-[var(--color-gold)] peer transition-colors resize-none disabled:opacity-50"
        />
        <label
          htmlFor="message"
          className="absolute text-sm text-[var(--color-text-muted)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[var(--color-gold)]"
        >
          Your Message *
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full sm:w-auto self-start bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] px-12 py-4 text-[10px] font-bold uppercase tracking-[0.25em] transition-all duration-500 hover:shadow-xl hover:shadow-[var(--color-gold)]/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? "Submitting..." : "Submit Inquiry"}
      </button>
    </form>
  );
}
