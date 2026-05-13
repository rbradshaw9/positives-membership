import { Suspense } from "react";
import { ActiveCampaignTracking } from "@/components/analytics/ActiveCampaignTracking";
import { FirstPromoterScripts } from "@/components/analytics/FirstPromoterScripts";
import { PublicAnalyticsSlot } from "@/components/analytics/PublicAnalyticsSlot";
import { ReferralCapture } from "@/components/analytics/ReferralCapture";

export function PublicGrowthScriptsSlot() {
  return (
    <>
      <PublicAnalyticsSlot />
      <Suspense fallback={null}>
        <ActiveCampaignTracking />
      </Suspense>
      <Suspense fallback={null}>
        <FirstPromoterScripts />
      </Suspense>
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
    </>
  );
}
