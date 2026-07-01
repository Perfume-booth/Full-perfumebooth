import Image from "next/image";
import { AnimatedPhone } from "@/components/ui/icons/AnimatedPhone";
import { AnimatedMail } from "@/components/ui/icons/AnimatedMail";
import { AnimatedClock } from "@/components/ui/icons/AnimatedClock";
import { AnimatedMapPin } from "@/components/ui/icons/AnimatedMapPin";
import { AnimatedInstagram } from "@/components/ui/icons/AnimatedInstagram";
import { AnimatedFacebook } from "@/components/ui/icons/AnimatedFacebook";
import { AnimatedXSocial } from "@/components/ui/icons/AnimatedXSocial";
import { AnimatedYoutube } from "@/components/ui/icons/AnimatedYoutube";
import { AnimatedCheckCircle } from "@/components/ui/icons/AnimatedCheckCircle";
import { AnimatedTruck } from "@/components/ui/icons/AnimatedTruck";
import { AnimatedRotateCcw } from "@/components/ui/icons/AnimatedRotateCcw";
import { AnimatedLock } from "@/components/ui/icons/AnimatedLock";
import { AnimatedPinterest } from "@/components/ui/icons/AnimatedPinterest";
import { COMPANY, NAV_LINKS } from "@/lib/constants";
import Dock from "@/components/ui/dock";
import NewsletterStrip from "./NewsletterStrip";
import { SiRazorpay } from "react-icons/si";
import { TextHoverEffect, FooterBackgroundGradient } from "@/components/ui/hover-footer";

const POLICY_LINKS = [
    { label: "Blog", href: "/blog" },
    { label: "About Us", href: "/info/about-us" },
    { label: "Contact Us", href: "/info/contact-us" },
    { label: "Disclaimers", href: "/info/disclaimers" },
    { label: "Privacy Policy", href: "/info/policies/privacy" },
    { label: "Shipping Policy", href: "/info/policies/shipping" },
    { label: "Refund and Return Policy", href: "/info/policies/refund" },
    { label: "Terms and Conditions", href: "/info/policies/terms" },
    { label: "FAQ", href: "/info/faq" },
    { label: "Track Order", href: "/track-order" },
];

const SOCIAL_LINKS = [
    { icon: AnimatedInstagram, label: "Instagram", href: "https://www.instagram.com/perfumeboothindia?igsh=ZXNydDBpcnM4Nnlz", color: "#E1306C" },
    { icon: AnimatedFacebook, label: "Facebook", href: "https://www.facebook.com/perfumeboothin", color: "#1877F2" },
    { icon: AnimatedXSocial, label: "X", href: "https://www.x.com/perfumebooth", color: "#000000" },
    { icon: AnimatedYoutube, label: "YouTube", href: "https://www.youtube.com/@perfumebooth", color: "#FF0000" },
    { icon: AnimatedPinterest, label: "Pinterest", href: "https://www.pinterest.com/perfumeboothin/", color: "#E60023" },
];

const PAYMENT_METHODS = [
    { label: "Visa", src: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/visa.png?v=1781164108" },
    { label: "Mastercard", src: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mastercard.png?v=1781164108" },
    { label: "UPI", src: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/upi.png?v=1781164108" },
    { label: "COD", src: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/COD_1.png?v=1781690952" },
];

export default function Footer() {
    return (
        <footer className="bg-[var(--color-bg)] text-[var(--color-text-primary)]">
            {/* ─── Floating Footer Card ─── */}
            <div className="max-w-7xl mx-auto px-0 md:px-4 py-4 md:py-12 relative z-10 ">
                <div
                    className="relative md:rounded-3xl overflow-hidden border-t border-b border-[#d1c5b3]/30 md:border-l-[3px] md:border-r-[3px] border-[#b8924a] bg-gradient-to-r from-[#b8924a]/10 via-[var(--color-surface)] to-[#b8924a]/10"
                    style={{
                        boxShadow: "0 4px 24px rgba(184, 146, 74, 0.06)"
                    }}
                >
                    <FooterBackgroundGradient />

                    <div className="relative z-10 px-4 md:px-6 py-6 md:py-10 ">
                        {/* ─── Trust Badges ─── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pb-8 md:pb-10 border-b border-[#d1c5b3]/30 mb-8 md:mb-12 px-2 md:px-0">
                            {[
                                { icon: AnimatedTruck, title: "Free Shipping", sub: "On all prepaid orders" },
                                { icon: AnimatedRotateCcw, title: "Easy Returns", sub: "5-day hassle-free returns" },
                                { icon: AnimatedLock, title: "Secure Payments", sub: "100% SSL Protected" },
                                { icon: AnimatedCheckCircle, title: "100% Authentic", sub: "Genuine products only" },
                            ].map((badge) => (
                                <div key={badge.title} className="flex items-center gap-3">
                                    <div className="text-[var(--color-gold)] flex-shrink-0">
                                        <badge.icon size={24} strokeWidth={1.5} animateOn="view" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-[var(--color-gold)]">{badge.title}</p>
                                        <p className="text-[11px] text-[var(--color-text-secondary)]">{badge.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ─── Main Footer Columns ─── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 md:gap-8 lg:gap-12 px-4 sm:px-6 md:px-12 lg:px-20 md:text-center">

                            {/* Brand Column */}
                            <div className="sm:col-span-2 lg:col-span-2 space-y-6 flex flex-col items-start text-left w-full">

                                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-sm">
                                    India's trusted online destination for authentic Exclusive fragrances. From attars to EDPs, we bring the world's finest scents to your doorstep.
                                </p>

                                {/* Newsletter Subscribe Box */}
                                <div className="w-full max-w-sm">
                                    <NewsletterStrip isFooter />
                                </div>

                                {/* Social links */}
                                <div className="pt-2">
                                    <Dock
                                        className="py-1 justify-start target"
                                        items={SOCIAL_LINKS.map(({ icon: SocialIcon, label, href }) => ({
                                            icon: SocialIcon,
                                            label: label,
                                            href: href,
                                            target: "_blank",
                                        }))}
                                    />
                                </div>
                            </div>

                            {/* Shop Links */}
                            <div>
                                <h3 className="text-xs font-bold text-Exclusive text-[var(--color-gold)] mb-6 tracking-wider">
                                    Quick Shop
                                </h3>
                                <ul className="space-y-3">
                                    {NAV_LINKS.map((link) => (
                                        <li key={link.label}>
                                            <a
                                                href={link.href}
                                                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] transition-colors duration-200"
                                            >
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Help & Policy */}
                            <div>
                                <h3 className="text-xs font-bold text-Exclusive text-[var(--color-gold)] mb-6 tracking-wider">
                                    Help & Policy
                                </h3>
                                <ul className="space-y-3">
                                    {POLICY_LINKS.map((link) => (
                                        <li key={link.href}>
                                            <a
                                                href={link.href}
                                                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] transition-colors duration-200"
                                            >
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Contact */}
                            <div>
                                <h3 className="text-xs font-bold text-Exclusive text-[var(--color-gold)] mb-6 tracking-wider">
                                    Contact Us
                                </h3>
                                <ul className="space-y-4 text-center">
                                    <li className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)]">
                                        <AnimatedPhone size={16} className="mt-0.5 flex-shrink-0 text-[var(--color-gold)]" animateOn="hover" />
                                        <div className="space-y-1">
                                            <a href={`tel:${COMPANY.phone1}`} className="block hover:text-[var(--color-gold)] transition-colors duration-200">{COMPANY.phone1}</a>
                                            <a href={`tel:${COMPANY.phone2}`} className="block hover:text-[var(--color-gold)] transition-colors duration-200">{COMPANY.phone2}</a>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)]">
                                        <AnimatedMail size={16} className="mt-0.5 flex-shrink-0 text-[var(--color-gold)]" animateOn="hover" />
                                        <div className="space-y-1">
                                            <a href={`mailto:${COMPANY.email1}`} className="block hover:text-[var(--color-gold)] transition-colors duration-200 text-xs">{COMPANY.email1}</a>
                                            <a href={`mailto:${COMPANY.email2}`} className="block hover:text-[var(--color-gold)] transition-colors duration-200 text-xs">{COMPANY.email2}</a>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-3 text-[9px] font-bold text-[var(--color-text-secondary)]">
                                        <AnimatedClock size={16} className="flex-shrink-0 text-[var(--color-gold)]" animateOn="view" />
                                        <span>{COMPANY.hours}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <hr className="border-t border-[#d1c5b3]/30 my-8" />

                        {/* ─── Bottom Bar ─── */}
                        <div className="flex flex-col lg:flex-row justify-between items-center text-sm space-y-6 lg:space-y-0 text-[var(--color-text-secondary)] pt-2 px-4 sm:px-6 md:px-12 lg:px-24">
                            {/* Copyright & Razorpay */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                                <p className="text-[11px] text-[var(--color-text-muted)]" suppressHydrationWarning>
                                    © {new Date().getFullYear()} {COMPANY.name} — All rights reserved.
                                </p>
                                <div className="hidden sm:block w-[1px] h-3 bg-[#d1c5b3]/30" />
                                <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity duration-200 select-none">
                                    <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Powered by</span>
                                    <div className="flex items-center gap-1 text-[var(--color-text-primary)] hover:text-[#0B72E7] transition-colors duration-200">
                                        <SiRazorpay className="w-3.5 h-3.5 text-[#0B72E7]" />
                                        <span className="text-[11px] font-black tracking-tight uppercase">Razorpay</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment methods */}
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold font-sans">We Accept</span>
                                <div className="flex items-center gap-3">
                                    {PAYMENT_METHODS.map((pm) => {
                                        return (
                                            <div
                                                key={pm.label}
                                                title={pm.label}
                                                className={`relative hover:scale-105 transition-transform duration-200 flex items-center justify-center`}
                                            >
                                                <Image
                                                    src={pm.src}
                                                    alt={pm.label}
                                                    width={40}
                                                    height={40}
                                                    className="object-contain max-h-full max-w-full select-none pointer-events-none"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text hover effect centered/stretched at the bottom */}
                    <div className="hidden md:block px-6 flex justify-center h-[5rem] md:h-[19rem] relative z-10 pointer-events-none select-none -mt-4 md:-mt-10 pb-20">
                        <TextHoverEffect text="PERFUME BOOTH" className="w-full h-full pointer-events-auto" />
                    </div>
                </div>
            </div>
        </footer>
    );
}
