import { Suspense } from "react";
import { FirstPromoterScripts } from "@/components/analytics/FirstPromoterScripts";
import { ReferralCapture } from "@/components/analytics/ReferralCapture";

export function PublicGrowthScriptsSlot() {
  return (
    <>
      <Suspense fallback={null}>
        <FirstPromoterScripts />
      </Suspense>
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
    </>
  );
}
