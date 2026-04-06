import type { Metadata } from "next";
import FaqClient from "./faq-client";

export const metadata: Metadata = {
  title: "FAQ — Positives",
  description:
    "Frequently asked questions about Positives — the daily mindset practice by Dr. Paul Jenkins. Learn about pricing, cancellation, what's included, and how the practice works.",
};

export default function FaqPage() {
  return <FaqClient />;
}
