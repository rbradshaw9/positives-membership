"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { submitSupportForm, type SupportFormState } from "./actions";

const initial: SupportFormState = { status: "idle" };

export default function SupportPage() {
  const [state, formAction, isPending] = useActionState(submitSupportForm, initial);

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
          <nav className="flex items-center gap-6" aria-label="Support page navigation">
            <Link href="/" className="text-sm font-medium" style={{ color: "#68707A" }}>Home</Link>
            <Link href="/faq" className="text-sm font-medium" style={{ color: "#68707A" }}>FAQ</Link>
            <Link href="/login" className="text-sm font-medium" style={{ color: "#68707A" }}>Sign in</Link>
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
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(78,140,120,0.06) 0%, transparent 60%)" }}
        />
        <div
          className="relative max-w-2xl mx-auto px-8"
          style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(2.5rem, 4vw, 4rem)" }}
        >
          <p className="text-xs font-semibold uppercase mb-5" style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
            Support
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
            We&apos;re here to help.
          </h1>
          <p style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.72" }}>
            Questions about your membership, billing, or how the practice works? Send us a message and we&apos;ll get back to you within one business day.
          </p>
        </div>
      </section>

      {/* ─── Quick answers ───────────────────────────────────────────────── */}
      <section className="w-full" style={{ paddingBottom: "clamp(3rem, 5vw, 4rem)" }}>
        <div className="max-w-3xl mx-auto px-8">
          <p className="text-xs font-semibold uppercase mb-6" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
            Quick answers
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Cancel anytime",
                body: "Cancel immediately from your account settings. No calls, no hoops.",
              },
              {
                title: "30-day guarantee",
                body: "Not happy within 30 days? Email us for a full refund — no questions asked.",
              },
              {
                title: "Missed sessions",
                body: "Every session is saved in your library. Listen at your own pace, any time.",
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                className="rounded-2xl p-6"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(221,215,207,0.7)",
                  boxShadow: "0 2px 8px rgba(18,20,23,0.04)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: "rgba(78,140,120,0.1)" }}
                  aria-hidden="true"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="font-semibold mb-1.5" style={{ fontSize: "0.9rem", color: "#121417" }}>
                  {title}
                </p>
                <p style={{ fontSize: "0.875rem", color: "#68707A", lineHeight: "1.65" }}>{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm" style={{ color: "#9AA0A8" }}>
            Have a different question?{" "}
            <Link href="/faq" style={{ color: "#2F6FED", textDecoration: "underline" }}>
              Browse the full FAQ →
            </Link>
          </p>
        </div>
      </section>

      {/* ─── Contact Form ────────────────────────────────────────────────── */}
      <section className="w-full" style={{ paddingBottom: "clamp(5rem, 10vw, 9rem)" }}>
        <div className="max-w-3xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Left: Direct contact */}
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold uppercase mb-6" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
                Direct contact
              </p>
              <div className="space-y-6">
                <div>
                  <p className="font-medium mb-1" style={{ fontSize: "0.9rem", color: "#121417" }}>Email</p>
                  <a
                    href="mailto:support@gopositives.com"
                    className="text-sm transition-colors hover:opacity-80"
                    style={{ color: "#2F6FED" }}
                  >
                    support@gopositives.com
                  </a>
                </div>
                <div>
                  <p className="font-medium mb-1" style={{ fontSize: "0.9rem", color: "#121417" }}>Response time</p>
                  <p className="text-sm" style={{ color: "#68707A" }}>
                    We typically respond within 1 business day, Monday–Friday.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-3" style={{ fontSize: "0.9rem", color: "#121417" }}>More resources</p>
                  <div className="space-y-2">
                    <Link
                      href="/faq"
                      className="block text-sm transition-colors hover:opacity-80"
                      style={{ color: "#2F6FED" }}
                    >
                      Browse the FAQ →
                    </Link>
                    <Link
                      href="/about"
                      className="block text-sm transition-colors hover:opacity-80"
                      style={{ color: "#2F6FED" }}
                    >
                      About Dr. Paul →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-3">
              <p className="text-xs font-semibold uppercase mb-6" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
                Send a message
              </p>

              {state.status === "sent" ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(78,140,120,0.3)",
                    boxShadow: "0 4px 24px rgba(18,20,23,0.06)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: "rgba(78,140,120,0.1)" }}
                    aria-hidden="true"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2 className="font-heading font-bold mb-3" style={{ fontSize: "1.25rem", color: "#121417" }}>
                    Message sent.
                  </h2>
                  <p style={{ fontSize: "0.95rem", color: "#68707A", lineHeight: "1.72" }}>
                    Thanks for reaching out. We&apos;ll get back to you within one business day.
                  </p>
                </div>
              ) : (
                <form
                  action={formAction}
                  className="rounded-2xl p-8 space-y-5"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(221,215,207,0.7)",
                    boxShadow: "0 4px 24px rgba(18,20,23,0.06)",
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="support-name" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                        Name
                      </label>
                      <input
                        id="support-name"
                        name="name"
                        type="text"
                        required
                        placeholder="Your name"
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={{
                          background: "#FAFAF8",
                          border: "1px solid #DDD7CF",
                          color: "#121417",
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="support-email" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                        Email
                      </label>
                      <input
                        id="support-email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={{
                          background: "#FAFAF8",
                          border: "1px solid #DDD7CF",
                          color: "#121417",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="support-subject" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                      Topic
                    </label>
                    <select
                      id="support-subject"
                      name="subject"
                      className="w-full rounded-xl px-4 py-3 text-sm appearance-none cursor-pointer outline-none"
                      style={{
                        background: "#FAFAF8",
                        border: "1px solid #DDD7CF",
                        color: "#121417",
                      }}
                    >
                      <option value="general">General question</option>
                      <option value="billing">Billing or account</option>
                      <option value="technical">Technical issue</option>
                      <option value="feedback">Feedback</option>
                      <option value="cancellation">Cancellation / refund</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="support-message" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                      Message
                    </label>
                    <textarea
                      id="support-message"
                      name="message"
                      required
                      rows={5}
                      placeholder="How can we help?"
                      className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
                      style={{
                        background: "#FAFAF8",
                        border: "1px solid #DDD7CF",
                        color: "#121417",
                      }}
                    />
                  </div>

                  {state.status === "error" && (
                    <p className="text-sm" style={{ color: "#C94444" }}>
                      {state.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center justify-center font-semibold rounded-xl py-3 transition-opacity"
                    style={{
                      background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                      color: "#FFFFFF",
                      fontSize: "0.95rem",
                      letterSpacing: "-0.01em",
                      opacity: isPending ? 0.7 : 1,
                    }}
                  >
                    {isPending ? "Sending…" : "Send message →"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="w-full" style={{ background: "#FAFAF8", borderTop: "1px solid rgba(221,215,207,0.55)" }}>
        <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-wrap items-center gap-5">
            <Image src="/logos/positives-wordmark-dark.png" alt="Positives" width={80} height={18} style={{ height: 18, width: "auto", opacity: 0.4 }} />
            <Link href="/faq" className="text-xs" style={{ color: "#9AA0A8" }}>FAQ</Link>
            <Link href="/about" className="text-xs" style={{ color: "#9AA0A8" }}>About</Link>
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
