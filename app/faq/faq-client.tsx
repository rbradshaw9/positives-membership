"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef } from "react";

/* ─── FAQ Accordion ──────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: "What exactly is Positives?",
    a: "Positives is a daily practice membership built by Dr. Paul Jenkins, a licensed Clinical Psychologist with 30+ years of experience. Each morning you get a short guided audio session (5–15 minutes) designed to reset your thinking and help you move through your day with more clarity and calm. Alongside that, you get a weekly mindset principle and a monthly masterclass with Dr. Paul.",
  },
  {
    q: "How long are the daily sessions?",
    a: "Most daily sessions are 5–15 minutes. They're designed to fit before work, during lunch, or whenever suits your rhythm. You don't need to block off a long window — a few focused minutes is the whole idea.",
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
    a: "There's no free trial, but every membership includes an unconditional 30-day money-back guarantee. If the practice doesn't meaningfully improve your days within 30 days, email us and we'll refund you in full — no questions asked.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel immediately from your account settings. No calls, no cancellation hoops, no \"please tell us why\" friction. If you want to leave, you can leave.",
  },
  {
    q: "What devices does this work on?",
    a: "Positives works in any modern web browser on any device — phone, tablet, desktop. No app download required. A mobile app is on the roadmap.",
  },
  {
    q: "How is Positives different from a meditation app?",
    a: "Meditation apps train you to sit still. Positives trains you to think differently — the kind of mindset work that changes how you respond to stress, make decisions, and show up in relationships. Dr. Paul's approach is backed by 30+ years of clinical psychology, not just breathwork.",
  },
  {
    q: "What is the 'Founding Member' rate?",
    a: "The founding member rate ($37/month or $370/year, down from the standard $97/month) is a special price for early members who join during our launch. Your rate stays locked in permanently — when we raise prices for new members, yours doesn't change.",
  },
  {
    q: "What do the other pricing tiers include?",
    a: "Membership is the foundation. Membership + Events adds live workshops and event access. Coaching Circle adds weekly group coaching and deeper implementation support. Executive Coaching is the highest-touch option and begins with a Breakthrough Session.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(221,215,207,0.7)",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left gap-4 py-5"
        aria-expanded={open}
      >
        <span
          className="font-medium"
          style={{ fontSize: "1rem", color: "#121417", lineHeight: "1.5", letterSpacing: "-0.01em" }}
        >
          {q}
        </span>
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform"
          style={{
            background: open ? "rgba(47,111,237,0.1)" : "rgba(18,20,23,0.06)",
            transform: open ? "rotate(45deg)" : "none",
          }}
          aria-hidden="true"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={open ? "#2F6FED" : "#68707A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </button>
      <div
        ref={bodyRef}
        style={{
          overflow: "hidden",
          maxHeight: open ? "500px" : 0,
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
          {a}
        </p>
      </div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-dvh" style={{ background: "#FAFAF8" }}>
      {/* ─── Nav ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(250,250,248,0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.55)",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 py-4">
          <Link href="/">
            <Image
              src="/logos/positives-wordmark-dark.png"
              alt="Positives"
              width={120}
              height={26}
              style={{ height: 26, width: "auto" }}
            />
          </Link>
          <nav className="flex items-center gap-6" aria-label="FAQ page navigation">
            <Link href="/" className="text-sm font-medium" style={{ color: "#68707A" }}>Home</Link>
            <Link href="/join" className="text-sm font-semibold px-5 py-2.5 rounded-full" style={{ background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)", color: "#FFFFFF" }}>
              Join
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="relative w-full text-center overflow-hidden"
        style={{ background: "#FAFAF8" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.06) 0%, transparent 60%)" }}
        />
        <div
          className="relative max-w-2xl mx-auto px-8"
          style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(3rem, 5vw, 4rem)" }}
        >
          <p className="text-xs font-semibold uppercase mb-5" style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
            FAQ
          </p>
          <h1
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              letterSpacing: "-0.045em",
              lineHeight: "1.06",
              color: "#121417",
            }}
          >
            Questions, answered.
          </h1>
          <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.72" }}>
            Everything you need to know about Positives before you join. Can&apos;t find your answer?{" "}
            <Link href="/support" style={{ color: "#2F6FED", textDecoration: "underline" }}>
              Reach out to us.
            </Link>
          </p>
        </div>
      </section>

      {/* ─── FAQ Accordion ───────────────────────────────────────────────── */}
      <section
        className="w-full"
        style={{ paddingBottom: "clamp(5rem, 10vw, 9rem)" }}
      >
        <div className="max-w-3xl mx-auto px-8">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ─── Bottom CTA ──────────────────────────────────────────────────── */}
      <section
        className="w-full text-center"
        style={{ background: "#121417", borderTop: "1px solid #1C2028" }}
      >
        <div
          className="max-w-2xl mx-auto px-8"
          style={{ paddingTop: "clamp(4rem, 7vw, 6rem)", paddingBottom: "clamp(4rem, 7vw, 6rem)" }}
        >
          <h2
            className="font-heading font-bold mb-6"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.04em",
              lineHeight: "1.1",
              color: "#FFFFFF",
            }}
          >
            Still have questions?
          </h2>
          <p style={{ color: "#8A9199", lineHeight: "1.78", marginBottom: "2rem", fontSize: "1rem" }}>
            We&apos;re happy to help. Reach out and we typically respond within one business day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/support"
              className="inline-flex items-center justify-center font-semibold rounded-full"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 8px 32px rgba(47,111,237,0.35)",
                letterSpacing: "-0.01em",
                fontSize: "1rem",
                padding: "1rem 2.5rem",
              }}
            >
              Contact support →
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center justify-center font-semibold rounded-full"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.12)",
                letterSpacing: "-0.01em",
                fontSize: "1rem",
                padding: "1rem 2.5rem",
              }}
            >
              Join Positives →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="w-full" style={{ background: "#FAFAF8", borderTop: "1px solid rgba(221,215,207,0.55)" }}>
        <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-wrap items-center gap-5">
            <Image src="/logos/positives-wordmark-dark.png" alt="Positives" width={80} height={18} style={{ height: 18, width: "auto", opacity: 0.4 }} />
            <Link href="/about" className="text-xs" style={{ color: "#9AA0A8" }}>About</Link>
            <Link href="/support" className="text-xs" style={{ color: "#9AA0A8" }}>Support</Link>
            <Link href="/privacy" className="text-xs" style={{ color: "#9AA0A8" }}>Privacy</Link>
            <Link href="/terms" className="text-xs" style={{ color: "#9AA0A8" }}>Terms</Link>
          </div>
          <span className="text-xs" style={{ color: "#C4BDB5" }}>
            © {new Date().getFullYear()} Positives
          </span>
        </div>
      </footer>
    </div>
  );
}
