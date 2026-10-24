import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Email preferences | PerfumeBooth",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function NotificationLayout({ children }: { children: ReactNode }) {
  return children;
}
