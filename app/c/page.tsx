"use client";

/**
 * /c — Blank affiliate cookie-setter page.
 *
 * When an affiliate links to an external URL (e.g. their own blog),
 * the /go/[code] route bounces through here first:
 *   positives.life/c?via=TOKEN&_r=https://theirblog.com/post
 *
 * The root layout's RewardfulTracker reads ?via= and sets the tracking cookie.
 * This component then waits 1.2s and redirects the visitor to their destination.
 *
 * The page renders a fully transparent, empty div — visitors see nothing.
 */

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CookieSetter() {
  const searchParams = useSearchParams();
  const destination = searchParams.get("_r");

  useEffect(() => {
    if (!destination) {
      window.location.href = "/";
      return;
    }
    // Give Rewardful script time to fire and set cookie
    const timer = setTimeout(() => {
      window.location.href = destination;
    }, 1200);
    return () => clearTimeout(timer);
  }, [destination]);

  // Completely invisible — no flash, no spinner, nothing rendered
  return null;
}

export default function CookiePage() {
  return (
    <Suspense fallback={null}>
      <CookieSetter />
    </Suspense>
  );
}
