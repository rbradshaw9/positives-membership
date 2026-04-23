import type { Metadata } from "next";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import { LandingPageClient } from "./landing-client";

export const metadata: Metadata = {
  title: "Positives — A few minutes each day. A more positive life.",
  description:
    "Positives is a guided daily practice designed to help you think more clearly, respond more calmly, and build a life you actually enjoy living. From Dr. Paul Jenkins.",
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;

  return (
    <LandingPageClient
      session={session}
      signInHref={session.signInHref}
      paidHref={session.paidHref}
    />
  );
}
