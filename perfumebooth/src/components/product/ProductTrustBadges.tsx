import { AnimatedTruck as Truck } from "@/components/ui/icons/AnimatedTruck";
import { AnimatedShieldCheck as ShieldCheck } from "@/components/ui/icons/AnimatedShieldCheck";
import { AnimatedBanknote as Banknote } from "@/components/ui/icons/AnimatedBanknote";
import { AnimatedRotateCcw as RotateCcw } from "@/components/ui/icons/AnimatedRotateCcw";

export default function ProductTrustBadges() {
  const badges = [
    { icon: Truck, label: "Free Shipping on Prepaid" },
    { icon: ShieldCheck, label: "100% Authentic & Original" },
    { icon: Banknote, label: "Cash on Delivery Available" },
    { icon: RotateCcw, label: "Easy Replacement if Damaged" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-6 border-t border-[#f0f0f0] mt-6">
      {badges.map((badge, idx) => {
        const Icon = badge.icon;
        return (
          <div key={idx} className="flex flex-col items-center justify-center text-center p-3 bg-gray-50/50 rounded-sm">
            <Icon className="text-gray-400 mb-2" size={18} strokeWidth={1.5} animateOn="view" />
            <span className="text-[8px] uppercase tracking-widest text-[#777777] font-semibold leading-tight max-w-[90%]">
              {badge.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
