"use client";

import { useState } from "react";

const JOIN_FAQS = [
  {
    q: "What is the Founding Member rate?",
    a: "The founding member rate ($37/month or $370/year, down from the standard $97/month) is a permanent price lock for early members who join during launch. When we raise prices for new members, your rate stays exactly where it is — forever.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can manage cancellation from your account settings without contacting support. If you cancel, any paid access stays in place through your current billing period.",
  },
  {
    q: "What's included in Membership?",
    a: "Everything you need to start and sustain the practice: daily guided audio sessions fresh every morning, weekly mindset principles backed by research, a monthly theme from Dr. Paul, and access to the complete member library of every past session.",
  },
  {
    q: "What are the other pricing tiers?",
    a: "Membership + Events adds live member events and event replays as they are scheduled. Coaching Circle adds weekly group coaching and replay access. Executive Coaching is our most personalized path and begins with a Breakthrough Session.",
  },
  {
    q: "Is there a free trial?",
    a: "There's no free trial, but every membership comes with an unconditional 30-day money-back guarantee. If the practice doesn't meaningfully improve your days within 30 days, email support@positives.life for a full refund — no questions asked.",
  },
  {
    q: "What happens after 30 days?",
    a: "Your membership renews automatically each month (or annually if you chose that plan). You can cancel at any time from your account settings before the next billing date.",
  },
];

export function JoinPageFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div>
      {JOIN_FAQS.map((faq, i) => (
        <div key={faq.q} style={{ borderBottom: "1px solid rgba(221,215,207,0.7)" }}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between text-left gap-4 py-5"
            aria-expanded={openIndex === i}
          >
            <span
              className="font-medium"
              style={{ fontSize: "1rem", color: "#121417", lineHeight: "1.5", letterSpacing: "-0.01em" }}
            >
              {faq.q}
            </span>
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: openIndex === i ? "rgba(47,111,237,0.1)" : "rgba(18,20,23,0.06)",
                transform: openIndex === i ? "rotate(45deg)" : "none",
                transition: "transform 0.2s ease",
              }}
              aria-hidden="true"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke={openIndex === i ? "#2F6FED" : "#68707A"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </button>
          <div
            style={{
              overflow: "hidden",
              maxHeight: openIndex === i ? "300px" : 0,
              transition: "max-height 0.3s ease",
            }}
          >
            <p
              style={{
                fontSize: "0.975rem",
                color: "#68707A",
                lineHeight: "1.78",
                paddingBottom: "1.25rem",
              }}
            >
              {faq.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
