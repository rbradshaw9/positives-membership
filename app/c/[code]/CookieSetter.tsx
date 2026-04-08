"use client";

import { useEffect } from "react";

/**
 * Waits ~1.2s for the Rewardful script (loaded in root layout) to fire
 * and set the tracking cookie, then redirects the visitor to their destination.
 * Renders nothing — completely invisible to the user.
 */
export default function CookieSetter({ destination }: { destination: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = destination;
    }, 1200);
    return () => clearTimeout(timer);
  }, [destination]);

  return null;
}
