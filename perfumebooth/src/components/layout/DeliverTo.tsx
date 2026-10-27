"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedMapPin as MapPin } from "@/components/ui/icons/AnimatedMapPin";
import { AnimatedChevronDown } from "@/components/ui/icons/AnimatedChevronDown";
import { AnimatedX } from "@/components/ui/icons/AnimatedX";
import { cn } from "@/lib/utils";
import { safeStorage } from "@/lib/storage";
import { getLoggedAddressAction } from "@/lib/actions/actions";

// ── constants ──────────────────────────────────────────────────
const GOLD = "#b8924a";
const DARK = "#1a1410";
const MUTED = "#807667";
const BORDER = "#ede8e0";
const LS_KEY = "pb_deliver_to";

interface DeliveryLocation {
  label: string;      // e.g. "Mumbai" or the full pincode city
  pincode: string;    // e.g. "400001"
}

// ── Pincode → City lookup (common Indian pincodes) ─────────────
/* const PINCODE_MAP: Record<string, string> = {
  "110001": "New Delhi",
  "400001": "Mumbai",
  "400050": "Mumbai",
  "400052": "Mumbai",
  "700001": "Kolkata",
  "600001": "Chennai",
  "560001": "Bangalore",
  "122002": "Gurugram",
  "201301": "Noida",
  "380001": "Ahmedabad",
  "411001": "Pune",
  "500001": "Hyderabad",
};

function cityFromPincode(pin: string): string {
  return PINCODE_MAP[pin] || "Your Area";
} */

// ── Main Component ─────────────────────────────────────────────
export default function DeliverTo() {
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [open, setOpen] = useState(false);
  // const [pincodeInput, setPincodeInput] = useState("");
  // const [pincodeError, setPincodeError] = useState("");
  const [locating, setLocating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load from the customer account (if logged in) or localStorage
  useEffect(() => {
    async function initAddress() {
      try {
        // 1. Try to get the logged-in customer's default address
        const loggedAddr = await getLoggedAddressAction();
        
        // 2. Try to get saved choice from localStorage
        const saved = safeStorage.getItem(LS_KEY);
        const localLoc = saved ? JSON.parse(saved) : null;

        // Priority: If we have a local choice that is NOT the same as logged, 
        // we might want to respect it, but requirement says "address select last time for purchase".
        // Prefer the account default when available, otherwise use the local fallback.
        if (loggedAddr) {
          setLocation(loggedAddr);
        } else if (localLoc) {
          setLocation(localLoc);
        } else {
          setLocation(null);
        }
      } catch (err) {
        console.error("Failed to init address:", err);
      }
    }
    initAddress();

    window.addEventListener("pb_location_changed", initAddress);
    return () => {
      window.removeEventListener("pb_location_changed", initAddress);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveLocation = useCallback((loc: DeliveryLocation) => {
    setLocation(loc);
    safeStorage.setItem(LS_KEY, JSON.stringify(loc));
    setOpen(false);
    // setPincodeInput("");
    // setPincodeError("");
  }, []);

  /* const applyPincode = () => {
    const pin = pincodeInput.trim();
    if (!/^\d{6}$/.test(pin)) {
      setPincodeError("Please enter a valid 6-digit pincode");
      return;
    }
    saveLocation({ pincode: pin, label: cityFromPincode(pin) });
  }; */

  const useGeolocation = () => {
    if (!navigator.geolocation) {
      // Geolocation not supported
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
          );
          const data = await res.json();
          const pincode = data.postcode || "";
          const city = data.city || data.locality || "Your Area";
          saveLocation({ pincode, label: city });
        } catch {
          saveLocation({ pincode: "", label: "Your Location" });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        // Could not get location
      },
      { timeout: 8000 }
    );
  };

  const clearLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(null);
    safeStorage.removeItem(LS_KEY);
  };

  // Display text
  const displayCity = location
    ? location.label.length > 25
      ? location.label.slice(0, 25) + "…"
      : location.label
    : "Select Address";
  const displayPin = ""; // User requested no pincode in main view

  return (
    <div ref={ref} className="relative hidden lg:flex items-center flex-shrink-0">
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors group",
          open ? "bg-[#f6f3ee]" : "hover:bg-[#f6f3ee]"
        )}
        aria-label="Change delivery location"
      >
        <MapPin
          size={16}
          className="flex-shrink-0 transition-colors"
          style={{ color: GOLD }}
        />
        <div className="text-left min-w-0">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.22em] leading-tight" style={{ color: MUTED }}>
            Deliver to
          </p>
          <p
            className="text-[12px] font-bold leading-tight truncate max-w-[200px]"
            style={{ color: DARK }}
          >
            {displayCity}
            {displayPin && (
              <span className="font-semibold text-[11px]" style={{ color: DARK }}>
                {displayPin}
              </span>
            )}
          </p>
        </div>
        <AnimatedChevronDown
          size={12}
          className={cn("flex-shrink-0 transition-transform duration-200", open && "rotate-180")}
          style={{ color: MUTED }}
        />
      </button>

      {/* ── Dropdown Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] z-[500] w-[300px] bg-white rounded-xl overflow-hidden"
            style={{
              border: `1px solid ${BORDER}`,
              boxShadow: "0 8px 40px rgba(26,20,16,0.14), 0 2px 8px rgba(26,20,16,0.06)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: `1px solid ${BORDER}`, background: "#fdfcfb" }}
            >
              <div className="flex items-center gap-2">
                <MapPin size={13} style={{ color: GOLD }} />
                <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: DARK }}>
                  Delivery Location
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-0.5 rounded-full hover:bg-[#f0ede9] transition-colors"
              >
                <AnimatedX size={14} style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-4 space-y-4">

              {/* Use current location */}
              <button
                onClick={useGeolocation}
                disabled={locating}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors hover:bg-[#faf7f2] disabled:opacity-60"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `rgba(184,146,74,0.1)` }}
                >
                  {locating ? (
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
                    </svg>
                  )}
                </span>
                <div className="text-left">
                  <p className="text-[12px] font-bold" style={{ color: DARK }}>
                    {locating ? "Detecting location…" : "Use my current location"}
                  </p>
                  <p className="text-[9px]" style={{ color: MUTED }}>Using GPS</p>
                </div>
              </button>

              {/* Current location chip if set */}
              {location && (
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ background: "rgba(184,146,74,0.06)", border: `1px solid rgba(184,146,74,0.2)` }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={13} style={{ color: GOLD }} />
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: DARK }}>
                        {location.label}
                        {location.pincode && (
                          <span className="font-normal text-[10px]" style={{ color: MUTED }}>
                            {" "}{location.pincode}
                          </span>
                        )}
                      </p>
                      <p className="text-[9px]" style={{ color: MUTED }}>Current delivery location</p>
                    </div>
                  </div>
                  <button
                    onClick={clearLocation}
                    className="p-0.5 rounded-full hover:bg-[#f0ede9] transition-colors"
                    title="Clear location"
                  >
                    <AnimatedX size={12} style={{ color: MUTED }} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
