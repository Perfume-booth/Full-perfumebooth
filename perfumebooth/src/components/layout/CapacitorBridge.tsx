"use client";

import { useEffect } from "react";

export default function CapacitorBridge() {
  useEffect(() => {
    // Only execute on native iOS/Android devices
    async function initCapacitor() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        // 1. Configure Native Status Bar
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
        } catch (e) {
          // Status bar not available on this platform/web fallback
        }

        // 2. Configure Android Hardware Back Button
        try {
          const { App } = await import("@capacitor/app");
          App.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack && window.location.pathname !== "/") {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
        } catch (e) {
          // Back button listener fallback
        }
      } catch (err) {
        // Safe fail-silent if Capacitor is not present
      }
    }

    initCapacitor();
  }, []);

  return null;
}

