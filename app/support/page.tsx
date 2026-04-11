import type { Metadata } from "next";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import SupportClient from "./support-client";

export const metadata: Metadata = {
  title: "Support — Positives",
  description:
    "Get help with your Positives membership. Contact our support team, browse common questions, or find answers about billing, cancellation, and how the practice works.",
  alternates: {
    canonical: "/support",
  },
};

export default function SupportPage() {
  return <SupportClient session={ANONYMOUS_PUBLIC_SESSION_STATE} />;
}
