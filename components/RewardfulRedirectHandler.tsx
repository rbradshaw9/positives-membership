"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Reads the `_r` (redirect destination) query param set by /go/[code]
 * for external URLs. After a short delay (giving Rewardful time to fire
 * and set the cookie), redirects the visitor to their final destination.
 */
function Handler() {
  const searchParams = useSearchParams();
  const destination = searchParams.get("_r");

  useEffect(() => {
    if (!destination) return;
    const timer = setTimeout(() => {
      window.location.href = destination;
    }, 1200); // 1.2s — enough for Rewardful script to run
    return () => clearTimeout(timer);
  }, [destination]);

  return null;
}

export function RewardfulRedirectHandler() {
  return (
    <Suspense fallback={null}>
      <Handler />
    </Suspense>
  );
}
