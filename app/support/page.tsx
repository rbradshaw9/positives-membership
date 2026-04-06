import type { Metadata } from "next";
import SupportClient from "./support-client";

export const metadata: Metadata = {
  title: "Support — Positives",
  description:
    "Get help with your Positives membership. Contact our support team, browse common questions, or find answers about billing, cancellation, and how the practice works.",
};

export default function SupportPage() {
  return <SupportClient />;
}
