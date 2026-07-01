"use client";

import Lottie from "lottie-react";
import whatsappAnimation from "../../../public/lottie/whatsapp.json";
import { COMPANY } from "@/lib/constants";

export default function WhatsAppCTA() {
    return (
        <a
            href={`https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(
                "Hello! I need help with my order."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-20 md:bottom-28 right-2 md:right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-transform duration-300"
            title="Chat on WhatsApp"
        >
            <div className="w-16 h-16 flex items-center justify-center">
                <Lottie animationData={whatsappAnimation} loop={true} />
            </div>
        </a>
    );
}
