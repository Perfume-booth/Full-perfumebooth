import { AnimatedTruck as Truck } from "@/components/ui/icons/AnimatedTruck";
import { AnimatedShieldCheck as ShieldCheck } from "@/components/ui/icons/AnimatedShieldCheck";
import { AnimatedBanknote as Banknote } from "@/components/ui/icons/AnimatedBanknote";
import { AnimatedRotateCcw as RotateCcw } from "@/components/ui/icons/AnimatedRotateCcw";

export default function ProductTrustBadges() {
  const badges = [
    { icon: Truck, label: "Free Shipping over ₹999" },
    { icon: ShieldCheck, label: "100% Authentic & Original" },
    { icon: Banknote, label: "Cash on Delivery Available" },
    { icon: RotateCcw, label: "Easy Replacement if Damaged" },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5 md:gap-2.5 border-t border-[#f0f0f0] pt-2">
      {badges.map((badge, idx) => {
        const Icon = badge.icon;
        return (
          <div key={idx} className="flex flex-col items-center justify-center text-center py-1.5 px-1 bg-gray-50/50 rounded-sm">
            <Icon className="text-[#b8924a] mb-1" size={17} strokeWidth={1.5} animateOn="view" />
            <span className="text-[8px] uppercase tracking-wider text-[#777777] font-semibold leading-tight max-w-[95%]">
              {badge.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
