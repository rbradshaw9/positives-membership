"use client";

import { useState } from "react";

const LANDING_FAQS = [
  {
    q: "What exactly is Positives?",
    a: "Positives is a daily practice membership built by Dr. Paul Jenkins, a licensed Clinical Psychologist with 30+ years of experience. Each day you get a short guided audio session (5–15 minutes) designed to reset your thinking and help you move through your day with more clarity and calm. Alongside that, you get a weekly mindset principle and a monthly theme from Dr. Paul.",
  },
  {
    q: "How long are the daily sessions?",
    a: "Most daily sessions are 5–15 minutes. They're designed to fit before work, during lunch, or whenever suits your rhythm. You don't need to block off a long window — a few focused minutes is the whole idea.",
  },
  {
    q: "How is Positives different from a meditation app?",
    a: "Meditation apps train you to sit still. Positives trains you to think differently — the kind of mindset work that changes how you respond to stress, make decisions, and show up in relationships. Dr. Paul's approach is backed by 30+ years of clinical psychology, not just breathwork.",
  },
  {
    q: "Is this the same as the Live on Purpose podcast?",
    a: "No — the Live on Purpose Radio podcast is Dr. Paul's free, public show. Positives is a private daily practice created specifically for members. The content goes deeper, is more personal, and is designed to be experienced daily rather than occasionally.",
  },
  {
    q: "What if I miss a day?",
    a: "Every session is always available in your member library. You can listen at any pace, skip days, or circle back. There's no streak requirement or guilt mechanic — Positives is a practice, not a course with a deadline.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Positives now offers a 7-day free trial through our trial-first offer path, and every paid membership also includes a 30-day money-back guarantee. If the practice doesn't meaningfully improve your days within 30 days of paying, email us and we'll refund you in full — no questions asked.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can manage cancellation from your account settings without contacting support. If you cancel, any paid access stays in place through your current billing period.",
  },
  {
    q: "What devices does this work on?",
    a: "Positives works in any modern web browser on any device — phone, tablet, desktop. No app download required. A mobile app is on the roadmap.",
  },
  {
    q: "What is the 'Founding Member' rate?",
    a: "The founding member rate ($37/month or $370/year, down from the standard $97/month) is a special price for early members who join during our launch. Your rate stays locked in permanently — when we raise prices for new members, yours doesn't change.",
  },
  {
    q: "What do the other pricing tiers include?",
    a: "Membership is the foundation. Membership + Events adds live member events plus replay access as those sessions are published. Coaching Circle adds weekly live coaching and replay access. Executive Coaching is the highest-touch option and begins with a Breakthrough Session.",
  },
] as const;

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      {LANDING_FAQS.map((faq, index) => (
        <div key={faq.q} style={{ borderBottom: "1px solid rgba(221,215,207,0.7)" }}>
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between gap-4 py-5 text-left"
            aria-expanded={openIndex === index}
          >
            <span className="font-medium" style={{ fontSize: "1rem", color: "#121417", lineHeight: "1.5", letterSpacing: "-0.01em" }}>
              {faq.q}
            </span>
            <span
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{
                background: openIndex === index ? "rgba(47,111,237,0.1)" : "rgba(18,20,23,0.06)",
                transform: openIndex === index ? "rotate(45deg)" : "none",
                transition: "transform 0.2s ease",
              }}
              aria-hidden="true"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={openIndex === index ? "#2F6FED" : "#68707A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </button>
          <div style={{ overflow: "hidden", maxHeight: openIndex === index ? "300px" : 0, transition: "max-height 0.3s ease" }}>
            <p style={{ fontSize: "0.975rem", color: "#68707A", lineHeight: "1.78", paddingBottom: "1.25rem" }}>
              {faq.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
