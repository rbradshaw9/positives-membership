import type { Metadata } from "next";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import FaqClient from "./faq-client";

export const metadata: Metadata = {
  title: "FAQ — Positives",
  description:
    "Frequently asked questions about Positives — the daily mindset practice by Dr. Paul Jenkins. Learn about pricing, cancellation, what's included, and how the practice works.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FaqPage() {
  return <FaqClient session={ANONYMOUS_PUBLIC_SESSION_STATE} />;
}
