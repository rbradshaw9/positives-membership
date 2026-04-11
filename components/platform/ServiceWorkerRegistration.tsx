"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !window.isSecureContext
    ) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[Positives] Service worker registration failed", error);
    });
  }, []);

  return null;
}
