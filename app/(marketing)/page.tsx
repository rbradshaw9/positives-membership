import type { Metadata } from "next";
import { appendPublicTrackingParams, type PublicSearchParams } from "@/lib/marketing/public-query-params";
import { getPublicSessionState } from "@/lib/marketing/public-session";
import { LandingPageClient } from "./landing-client";

export const metadata: Metadata = {
  title: "Positives — A few minutes each day. A more positive life.",
  description:
    "Positives is a guided daily practice designed to help you think more clearly, respond more calmly, and build a life you actually enjoy living. From Dr. Paul Jenkins.",
  alternates: {
    canonical: "/",
  },
};

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  const session = await getPublicSessionState();
  const resolvedSearchParams = await searchParams;

  return (
    <LandingPageClient
      session={session}
      signInHref={session.signInHref}
      paidHref={appendPublicTrackingParams(session.paidHref, resolvedSearchParams)}
      watchHref={appendPublicTrackingParams(session.watchHref, resolvedSearchParams)}
    />
  );
}
