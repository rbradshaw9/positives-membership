"use client";

/**
 * components/RewardfulTracker.tsx
 *
 * Injects the Rewardful JS snippet per the official Next.js App Router guide:
 * https://www.getrewardful.com/setup/code?platform=nextjs
 *
 * Script order matters:
 *   1. Init queue (beforeInteractive) — must run before SDK so window.rewardful
 *      is defined when the SDK loads
 *   2. SDK (afterInteractive) — loads asynchronously after hydration
 *
 * The referral ID is NOT read from a cookie. It is read client-side via:
 *   rewardful('ready', () => Rewardful.referral)
 * and injected as a hidden input in the checkout form by PricingCard.
 */

import Script from "next/script";

const REWARDFUL_API_KEY = "6e2909";

export function RewardfulTracker() {
  return (
    <>
      {/* Must be beforeInteractive so window.rewardful exists when SDK loads */}
      <Script id="rewardful-queue" strategy="beforeInteractive">
        {`(function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)}})(window,'rewardful');`}
      </Script>
      <Script
        src="https://r.wdfl.co/rw.js"
        data-rewardful={REWARDFUL_API_KEY}
        strategy="afterInteractive"
      />
    </>
  );
}
