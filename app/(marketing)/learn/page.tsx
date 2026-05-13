import type { Metadata } from "next";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import { LandingPageClient } from "../landing-client";

export const metadata: Metadata = {
  title: "Learn About Positives — Daily Practice Membership",
  description:
    "Learn how Positives works: daily guided audio, a weekly principle, and a monthly theme from Dr. Paul Jenkins.",
  alternates: {
    canonical: "/learn",
  },
};

export default function LearnAboutPositivesPage() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;

  return (
    <LandingPageClient
      session={session}
      signInHref={session.signInHref}
      paidHref={session.paidHref}
    />
  );
}
