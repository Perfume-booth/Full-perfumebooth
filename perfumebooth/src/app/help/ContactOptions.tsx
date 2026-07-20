"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, Mail, Phone, Clock } from "lucide-react";
import { AnimatedMessageCircle as WhatsAppIcon } from "@/components/ui/icons/AnimatedMessageCircle";
import { COMPANY } from "@/lib/constants";

const CONTACT_CHANNELS = [
  {
    icon: WhatsAppIcon,
    label: "WhatsApp",
    value: `+91 ${COMPANY.whatsapp}`,
    actionLabel: "Chat Now",
    href: `https://wa.me/${COMPANY.whatsapp}`,
    color: "#25D366",
  },
  {
    icon: Mail,
    label: "Email Support",
    value: COMPANY.email1,
    actionLabel: "Send Email",
    href: `mailto:${COMPANY.email1}`,
    color: "var(--color-gold)",
  },
  {
    icon: Phone,
    label: "Phone",
    value: COMPANY.phone2,
    actionLabel: "Call Us",
    href: `tel:${COMPANY.phone2.replace(/\s/g, '')}`,
    color: "var(--color-gold)",
  },
];

export default function ContactOptions() {
  return (
    <div className="bg-[var(--color-bg-subtle)] rounded-3xl p-8 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Still Need Help?
          </h2>
          <p className="text-[var(--color-text-muted)] max-w-lg mx-auto">
            Our support team is here to help you with any questions or concerns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CONTACT_CHANNELS.map((channel, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -5 }}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-[var(--color-border)] transition-shadow hover:shadow-lg"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ background: `rgba(184, 146, 74, 0.1)`, color: channel.color }}
              >
                <channel.icon size={24} />
              </div>
              <h4 className="font-bold mb-1">{channel.label}</h4>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">{channel.value}</p>
              <a
                href={channel.href}
                className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors hover:bg-[var(--color-bg-subtle)]"
                style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
              >
                {channel.actionLabel}
              </a>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] italic">
          <Clock size={14} />
          <span>Support available Monday – Saturday : 10am – 6pm EST</span>
        </div>
      </div>
    </div>
  );
}
