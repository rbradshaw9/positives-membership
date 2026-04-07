"use client";

/**
 * components/RewardfulTracker.tsx
 *
 * Injects the Rewardful JS snippet once on the client so affiliate referrals
 * are tracked. The snippet sets a first-party cookie (rewardful_referral_id)
 * when a visitor arrives via an affiliate link.
 *
 * This cookie is then read by the join page and passed to Stripe checkout
 * as client_reference_id, which Rewardful uses to attribute the conversion.
 *
 * Only renders the <script> tag — no visible UI.
 */

import Script from "next/script";

const REWARDFUL_API_KEY = "6e2909";

export function RewardfulTracker() {
  return (
    <>
      <Script
        id="rewardful-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)}})(window,'rewardful');`,
        }}
      />
      <Script
        id="rewardful-sdk"
        src="https://r.wdfl.co/rw.js"
        data-rewardful={REWARDFUL_API_KEY}
        strategy="afterInteractive"
      />
    </>
  );
}
