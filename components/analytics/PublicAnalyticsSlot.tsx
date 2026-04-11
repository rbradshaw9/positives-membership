import { Suspense } from "react";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

export function PublicAnalyticsSlot() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <GoogleAnalytics measurementId={measurementId} />
    </Suspense>
  );
}
