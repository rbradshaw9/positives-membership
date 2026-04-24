import type { Metadata } from "next";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import type { PublicSearchParams } from "@/lib/marketing/public-query-params";
import PartnerApplyClient from "./partner-apply-client";

export const metadata: Metadata = {
  title: "Apply to Partner — Positives",
  description:
    "Apply to the Positives partner program and tell us who you serve, how you would share Positives, and why you are a strong fit.",
  alternates: {
    canonical: "/partners/apply",
  },
};

export default async function PartnerApplyPage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  return (
    <PartnerApplyClient
      session={ANONYMOUS_PUBLIC_SESSION_STATE}
      trackingParams={await searchParams}
    />
  );
}
