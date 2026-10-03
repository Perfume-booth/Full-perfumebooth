import { useState, useEffect } from "react";
import Image from "next/image";
import { ShieldCheck, Truck } from "lucide-react";

export default function ProductPaymentInfo({ className = "" }: { className?: string }) {
  const [pincode, setPincode] = useState<string | null>(null);
  const [city, setCity] = useState<string>("");

  useEffect(() => {
    const loadLocation = () => {
      const saved = localStorage.getItem("pb_deliver_to");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.pincode) {
            setPincode(parsed.pincode);
            setCity(parsed.label || "");
            return;
          }
        } catch (e) {}
      }
      setPincode(null);
      setCity("");
    };

    loadLocation();
    window.addEventListener("pb_location_changed", loadLocation);
    return () => window.removeEventListener("pb_location_changed", loadLocation);
  }, []);

  const getDeliveryDateStr = () => {
    const today = new Date();
    const deliveryDate = new Date(today);
    
    let days = 3;
    if (pincode) {
      const isMetro = ["11", "40", "56", "60", "70", "50", "12", "20", "38", "41"].some(prefix => pincode.startsWith(prefix));
      days = isMetro ? 2 : 4;
    }
    
    deliveryDate.setDate(today.getDate() + days);

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const weekday = weekdays[deliveryDate.getDay()];
    const day = deliveryDate.getDate();
    const month = months[deliveryDate.getMonth()];

    return `${weekday}, ${day} ${month}`;
  };

  const PAYMENT_METHODS = [
    { label: "Visa", src: "/images/payments/visa.png" },
    { label: "Mastercard", src: "/images/payments/mastercard.png" },
    { label: "UPI", src: "/images/payments/upi.png" },
    { label: "COD", src: "/images/payments/cod.png" },
  ];

  return (
    <div className={`bg-[#fdfcfb] border border-[#ede8e0] rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-4 shadow-sm ${className}`}>
      {/* Header Badge */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b8924a]">
        <ShieldCheck size={14} className="text-[#b8924a]" />
        <span>100% Safe & Secure Checkout</span>
      </div>

      {/* Payment Icons Grid */}
      <div className="flex items-center justify-center gap-4 py-1">
        {PAYMENT_METHODS.map((pm) => (
          <div
            key={pm.label}
            title={pm.label}
            className="relative flex items-center justify-center hover:scale-105 transition-transform duration-300 w-11 h-8 px-1.5 rounded bg-white border border-[#ede8e0] shadow-sm"
          >
            <Image
              src={pm.src}
              alt={pm.label}
              width={36}
              height={24}
              className="object-contain max-h-full max-w-full select-none pointer-events-none"
            />
          </div>
        ))}
      </div>

      {/* Subtext */}
      <div className="text-[11px] text-[#807667] font-medium tracking-wide">
        Your credentials and personal details are fully encrypted.
      </div>

      {/* Shipping Divider & Note */}
      <div className="pt-4 border-t border-[#ede8e0] w-full flex items-center justify-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
        <Truck size={13} className="text-[#b8924a] shrink-0" />
        {pincode ? (
          <span suppressHydrationWarning>Est. Delivery: {getDeliveryDateStr()} to {city || "India"} ({pincode})</span>
        ) : (
          <span>Est. Delivery: 3-5 business days across India</span>
        )}
      </div>
    </div>
  );
}

