import type { Metadata } from "next";
import { getPublicSessionState } from "@/lib/marketing/public-session";
import SupportClient from "./support-client";

export const metadata: Metadata = {
  title: "Support — Positives",
  description:
    "Get help with your Positives membership. Contact our support team, browse common questions, or find answers about billing, cancellation, and how the practice works.",
  alternates: {
    canonical: "/support",
  },
};

export default async function SupportPage() {
  const session = await getPublicSessionState();

  return <SupportClient session={session} />;
}
