"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { AnimatedPackage as Package } from "@/components/ui/icons/AnimatedPackage";
import { AnimatedTruck as Truck } from "@/components/ui/icons/AnimatedTruck";
import { AnimatedRotateCcw as RotateCcw } from "@/components/ui/icons/AnimatedRotateCcw";
import { AnimatedUser as User } from "@/components/ui/icons/AnimatedUser";
import { AnimatedCreditCard as CreditCard } from "@/components/ui/icons/AnimatedCreditCard";
import { AnimatedShieldCheck as ShieldCheck } from "@/components/ui/icons/AnimatedShieldCheck";
import { AnimatedChevronRight as ChevronRight } from "@/components/ui/icons/AnimatedChevronRight";
import Link from "next/link";

const CATEGORIES = [
  {
    icon: Truck,
    title: "Order Tracking",
    description: "Track your order in real-time",
    href: "/orders",
  },
  {
    icon: RotateCcw,
    title: "Returns & Exchanges",
    description: "Hassle-free returns within 7 days",
    href: "/info/policies",
  },
  {
    icon: ShieldCheck,
    title: "Authenticity",
    description: "Our 100% genuine product guarantee",
    href: "/info/about-us",
  },
  {
    icon: User,
    title: "My Account",
    description: "Manage your profile and preferences",
    href: "/account",
  },
  {
    icon: CreditCard,
    title: "Payments",
    description: "Secure payment methods and billing",
    href: "/info/faq",
  },
  {
    icon: Package,
    title: "Shipping Info",
    description: "Delivery timelines and international shipping",
    href: "/info/faq",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function SupportCategories() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {CATEGORIES.map((cat, idx) => (
        <motion.div key={idx} variants={itemVariants}>
          <Link
            href={cat.href}
            className="group block h-full p-8 rounded-2xl border bg-white transition-all hover:shadow-xl hover:-translate-y-1"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex flex-col h-full">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors group-hover:scale-110 duration-300"
                style={{ background: "var(--color-bg-subtle)", color: "var(--color-gold)" }}
              >
                <cat.icon size={24} strokeWidth={1.5} />
              </div>
              <h3
                className="text-lg font-bold mb-2 group-hover:text-[var(--color-gold)] transition-colors"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {cat.title}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-6 flex-1">
                {cat.description}
              </p>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">
                View More
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
