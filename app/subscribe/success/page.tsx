import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "You're In — Positives",
  description: "Your Positives membership is now active. Start your first practice today.",
};

/**
 * app/subscribe/success/page.tsx
 * Return page shown after Stripe Checkout completes.
 *
 * Important: this page does NOT assume the webhook has already fired.
 * Stripe Checkout completing does not mean the member row is updated yet.
 * The webhook handles subscription_status — this page explains that
 * access may take a moment and invites the member to proceed.
 *
 * Server-side access control on /today handles the actual gate.
 */
export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#FAFAF8" }}>

      {/* ── Minimal nav ─────────────────────────────────────────────────── */}
      <header
        className="w-full"
        style={{
          background: "rgba(250,250,248,0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.55)",
        }}
      >
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-center">
          <Link href="/">
            <Image
              src="/logos/positives-wordmark-dark.png"
              alt="Positives"
              width={120}
              height={26}
              style={{ height: 26, width: "auto" }}
              priority
            />
          </Link>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-xl text-center"
          style={{ paddingTop: "clamp(4rem, 8vw, 6rem)", paddingBottom: "clamp(4rem, 8vw, 6rem)" }}
        >

          {/* ── Section 1: Success confirmation ──────────────────────────── */}
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-10"
            style={{
              background: "rgba(78,140,120,0.12)",
              border: "1.5px solid rgba(78,140,120,0.22)",
            }}
            aria-hidden="true"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4E8C78"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <p
            className="text-xs font-semibold uppercase mb-5"
            style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
          >
            Membership Active
          </p>

          <h1
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(3.5rem, 9vw, 7rem)",
              letterSpacing: "-0.055em",
              lineHeight: "1.0",
              color: "#121417",
            }}
          >
            You&apos;re in.
          </h1>

          <p
            className="mb-16 mx-auto"
            style={{
              fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
              color: "#68707A",
              lineHeight: "1.72",
              maxWidth: "420px",
              letterSpacing: "-0.01em",
            }}
          >
            Your Positives membership is now active.
          </p>

          {/* ── Divider ──────────────────────────────────────────────────── */}
          <div
            className="w-full mx-auto mb-16"
            style={{ height: "1px", background: "rgba(221,215,207,0.7)", maxWidth: "320px" }}
          />

          {/* ── Section 2: Welcome ───────────────────────────────────────── */}
          <h2
            className="font-heading font-bold mb-5"
            style={{
              fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
              letterSpacing: "-0.04em",
              lineHeight: "1.08",
              color: "#121417",
            }}
          >
            Welcome to Positives.
          </h2>

          <p
            className="mb-16 mx-auto"
            style={{
              fontSize: "1.05rem",
              color: "#68707A",
              lineHeight: "1.78",
              maxWidth: "480px",
              letterSpacing: "-0.01em",
            }}
          >
            Positives is a simple daily practice designed to help you think more
            clearly, respond more calmly, and build a more positive life.
            The best way to begin is simply to start today&apos;s practice.
          </p>

          {/* ── Section 3: What happens next ─────────────────────────────── */}
          <div
            className="w-full rounded-3xl mx-auto mb-14 text-left"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(221,215,207,0.7)",
              boxShadow: "0 8px 32px rgba(18,20,23,0.06)",
              padding: "clamp(1.75rem, 4vw, 2.5rem)",
              maxWidth: "480px",
            }}
          >
            <p
              className="text-xs font-semibold uppercase mb-8"
              style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
            >
              What happens next
            </p>

            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Listen to today's practice",
                  desc: "A short guided audio designed to reset your mindset.",
                },
                {
                  step: "2",
                  title: "Reflect on the idea",
                  desc: "Carry the concept with you throughout the day.",
                },
                {
                  step: "3",
                  title: "Return tomorrow",
                  desc: "Consistency is what makes the practice powerful.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-5">
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold"
                    style={{
                      background: "rgba(47,111,237,0.08)",
                      color: "#2F6FED",
                      fontSize: "0.8rem",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {step}
                  </span>
                  <div>
                    <p
                      className="font-semibold mb-1"
                      style={{ fontSize: "0.975rem", color: "#121417", letterSpacing: "-0.02em" }}
                    >
                      {title}
                    </p>
                    <p style={{ fontSize: "0.9rem", color: "#9AA0A8", lineHeight: "1.65" }}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 4: Start practice CTA ────────────────────────────── */}
          <Link
            href="/today"
            className="inline-flex items-center justify-center font-semibold rounded-full mb-5"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              boxShadow: "0 8px 28px rgba(47,111,237,0.30)",
              letterSpacing: "-0.01em",
              fontSize: "1rem",
              padding: "1rem 2.5rem",
            }}
          >
            Start today&apos;s practice →
          </Link>

          {/* ── Section 5: Reassurance ────────────────────────────────────── */}
          <p
            className="text-sm"
            style={{ color: "#B0A89E", lineHeight: "1.65", maxWidth: "380px", margin: "0 auto" }}
          >
            Your membership is active and you can access your practice anytime
            by signing in.
          </p>

          {/* ── Webhook timing note ───────────────────────────────────────── */}
          <p
            className="mt-5 text-xs"
            style={{ color: "#C4BDB5" }}
          >
            If your access isn&apos;t ready immediately, wait a few seconds and
            try again — billing confirmation happens automatically.
          </p>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="w-full"
        style={{ borderTop: "1px solid rgba(221,215,207,0.55)", background: "#FAFAF8" }}
      >
        <div className="max-w-6xl mx-auto px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5">
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
