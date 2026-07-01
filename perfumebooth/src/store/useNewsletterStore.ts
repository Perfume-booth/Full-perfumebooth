import { create } from "zustand";
import { persist } from "zustand/middleware";
import { checkNewsletterSubscriptionAction } from "@/lib/actions/newsletter";

interface NewsletterState {
    isSubscribed: boolean;
    isDismissed: boolean;
    hasOrders: boolean;
    setSubscribed: (val: boolean) => void;
    setDismissed: (val: boolean) => void;
    checkSubscription: () => Promise<void>;
    reset: () => void;
}

export const useNewsletterStore = create<NewsletterState>()(
    persist(
        (set) => ({
            isSubscribed: false,
            isDismissed: false,
            hasOrders: false,
            setSubscribed: (val) => set({ isSubscribed: val }),
            setDismissed: (val) => set({ isDismissed: val }),
            reset: () => set({ isSubscribed: false, isDismissed: false, hasOrders: false }),
            checkSubscription: async () => {
                const res = await checkNewsletterSubscriptionAction();
                if (res.success) {
                    set({ 
                        isSubscribed: res.isSubscribed || false,
                        hasOrders: res.hasOrders || false
                    });
                }
            }
        }),
        {
            name: "newsletter-storage",
        }
    )
);
