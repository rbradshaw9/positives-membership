import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import { Logo } from "@/components/marketing/Logo";
import { PricingToggle } from "@/components/marketing/PricingToggle";

export const metadata = {
  title: "Join Positives — Choose Your Membership",
  description:
    "Start your Positives practice from $49/month. Daily guided audio, weekly principles, and monthly masterclasses with Dr. Paul Jenkins.",
};

function JoinPageNav() {
  return (
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
        <Logo href="/" kind="full" height={28} />
        <nav className="flex items-center gap-6" aria-label="Join page navigation">
          <Link href="/" className="text-sm font-medium" style={{ color: "#68707A" }}>
            Home
          </Link>
          <Link href="/login" className="text-sm font-medium" style={{ color: "#68707A" }}>
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * app/join/page.tsx
 * Public pricing and conversion page.
 *
 * Server component:
 *   - Reads auth state
 *   - Active members → /today
 *   - Passes price IDs from server env to PricingToggle (never exposed to client bundle)
 *   - Handles the check-email holding screen
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; email?: string; error?: string }>;
}) {
  const { step, email: emailParam, error: errorParam } = await searchParams;

  // ── Active member redirect ────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await supabase
      .from("member")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    if (member?.subscription_status === "active") {
      redirect("/today");
    }
  }

  // ── Price IDs resolved server-side (never bundled into client JS) ─────────
  const level1Monthly = config.stripe.prices.level1Monthly;
  const level1Annual  = config.stripe.prices.level1Annual;
  const level2Monthly = config.stripe.prices.level2Monthly;
  const level2Annual  = config.stripe.prices.level2Annual;
  const level3Monthly = config.stripe.prices.level3Monthly;
  const level3Annual  = config.stripe.prices.level3Annual;
  const level4Monthly = config.stripe.prices.level4Monthly;
  const level4Annual  = config.stripe.prices.level4Annual;

  // ── Check-email holding screen ────────────────────────────────────────────
  if (step === "check-email") {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: "#FAFAF8" }}>
        <JoinPageNav />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-sm text-center">
            <div
              className="rounded-3xl p-10 mb-6"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(221,215,207,0.7)",
                boxShadow: "0 16px 48px rgba(18,20,23,0.08)",
              }}
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-6"
                style={{ background: "rgba(47,111,237,0.10)" }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2F6FED"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <polyline points="22 7 12 13 2 7" />
                </svg>
              </div>
              <h1
                className="font-heading font-bold mb-3"
                style={{ fontSize: "1.5rem", letterSpacing: "-0.04em", color: "#121417" }}
              >
                Check your email
              </h1>
              <p className="text-sm" style={{ color: "#68707A", lineHeight: "1.72" }}>
                We sent a sign-in link to{" "}
                <span style={{ color: "#121417", fontWeight: 600 }}>
                  {emailParam ?? "your email"}
                </span>
                . Click it to complete your account and start checkout.
              </p>
            </div>
            <Link
              href="/join"
              className="text-xs"
              style={{ color: "#9AA0A8" }}
            >
              ← Back to join
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main join page ────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden" style={{ background: "#FAFAF8" }}>
      <JoinPageNav />

      {/* ━━ 1. PRICING INTRO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full text-center px-6 overflow-hidden"
        style={{ background: "#FAFAF8" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.06) 0%, transparent 60%)" }}
        />
        <div
          className="relative max-w-2xl mx-auto"
          style={{ paddingTop: "clamp(2rem, 4vw, 3.5rem)", paddingBottom: "clamp(1.5rem, 2.5vw, 2.5rem)" }}
        >
          <p
            className="text-xs font-semibold uppercase mb-4"
            style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
          >
            Dr. Paul Jenkins · Clinical Psychologist
          </p>
          <h1
            className="font-heading font-bold mb-4"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              letterSpacing: "-0.045em",
              lineHeight: "1.06",
              color: "#121417",
              whiteSpace: "nowrap",
            }}
          >
            Choose your starting point.
          </h1>
          <p
            className="mb-4 mx-auto"
            style={{
              fontSize: "clamp(0.95rem, 1.5vw, 1.05rem)",
              color: "#68707A",
              lineHeight: "1.68",
              maxWidth: "480px",
              letterSpacing: "-0.01em",
            }}
          >
            Begin the Positives practice today and build a mindset that grows stronger every day.
          </p>
        </div>
      </section>

      {/* ━━ 2. PRICING TOGGLE + CARDS + AUTH GATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="start"
        className="w-full px-6"
        style={{
          paddingBottom: "clamp(4rem, 7vw, 6rem)",
          background: "#FAFAF8",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <PricingToggle
            isAuthenticated={!!user}
            userEmail={user?.email ?? null}
            initialError={errorParam ?? null}
            level1Monthly={level1Monthly}
            level1Annual={level1Annual}
            level2Monthly={level2Monthly}
            level2Annual={level2Annual}
            level3Monthly={level3Monthly}
            level3Annual={level3Annual}
            level4Monthly={level4Monthly}
            level4Annual={level4Annual}
          />
        </div>
      </section>

      {/* ━━ 3. VALUE SECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full"
        style={{ background: "#121417", borderTop: "1px solid #1C2028" }}
      >
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          style={{ paddingTop: "clamp(5rem, 9vw, 8rem)", paddingBottom: "clamp(5rem, 9vw, 8rem)" }}
        >
          <div>
            <p
              className="text-xs font-semibold uppercase mb-6"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
            >
              The system
            </p>
            <h2
              className="font-heading font-bold mb-7"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3.75rem)",
                letterSpacing: "-0.045em",
                lineHeight: "1.06",
                color: "#FFFFFF",
              }}
            >
              More than a membership.
            </h2>
            <div
              className="space-y-4"
              style={{ fontSize: "1.05rem", color: "#8A9199", lineHeight: "1.78" }}
            >
              <p>Positives is a complete system for building a more positive life.</p>
              <p>
                The daily practice helps you reset your thinking. Weekly
                principles deepen your understanding. Monthly themes create
                lasting change.
              </p>
              <p style={{ color: "#CBD2D9" }}>
                As the platform grows, members can join live sessions,
                participate in workshops, and explore deeper coaching experiences.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {[
              { label: "Daily guided audio practice", sub: "Fresh every morning" },
              { label: "Weekly mindset principles", sub: "Backed by research" },
              { label: "Monthly masterclass with Dr. Paul", sub: "Live + replay" },
              { label: "Complete member library", sub: "Every past session" },
              { label: "Live sessions & workshops", sub: "As new levels launch" },
            ].map(({ label, sub }) => (
              <div
                key={label}
                className="flex items-center gap-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(78,140,120,0.18)" }}
                  aria-hidden="true"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4E8C78"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <p className="font-medium" style={{ fontSize: "1rem", color: "#CBD2D9", letterSpacing: "-0.01em" }}>
                    {label}
                  </p>
                  <p className="text-xs" style={{ color: "#4A5360" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ 4. GUARANTEE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="w-full"
        style={{ background: "#F6F3EE", borderTop: "1px solid #DDD7CF" }}
      >
        <div
          className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          style={{ paddingTop: "clamp(5rem, 9vw, 8rem)", paddingBottom: "clamp(5rem, 9vw, 8rem)" }}
        >
          <div>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
              style={{ background: "#FFFFFF", border: "1px solid #DDD7CF" }}
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4E8C78"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p
              className="text-xs font-semibold uppercase mb-5"
              style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
            >
              Our promise
            </p>
            <h2
              className="font-heading font-bold"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3.75rem)",
                letterSpacing: "-0.045em",
                lineHeight: "1.06",
                color: "#121417",
              }}
            >
              30-day money-back guarantee.
            </h2>
          </div>

          <div className="space-y-5" style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.78" }}>
            <p>
              We are confident this practice will make a real difference in your
              life. But we also understand that trust has to be earned.
            </p>
            <p>
              That&apos;s why every Positives membership comes with an
              unconditional 30-day money-back guarantee. If you do the practice
              and it doesn&apos;t meaningfully improve your days, simply email us
              within 30 days and we&apos;ll refund your membership in full.
            </p>
            <p>No hoops to jump through. No questions asked. No hassle.</p>
            <p className="font-semibold" style={{ color: "#121417" }}>
              We believe the practice will speak for itself. This guarantee just
              means there&apos;s nothing to risk.
            </p>
          </div>
        </div>
      </section>

      {/* ━━ 5. FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative w-full text-center overflow-hidden"
        style={{ background: "#121417", borderTop: "1px solid #1C2028" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(47,111,237,0.18) 0%, transparent 60%)" }}
        />
        <div
          className="relative max-w-4xl mx-auto px-8"
          style={{ paddingTop: "clamp(5rem, 10vw, 9rem)", paddingBottom: "clamp(5rem, 10vw, 9rem)" }}
        >
          <h2
            className="font-heading font-bold mb-8"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 4.5rem)",
              lineHeight: "1.04",
              letterSpacing: "-0.05em",
              color: "#FFFFFF",
            }}
          >
            <span style={{ display: "block", whiteSpace: "nowrap" }}>A few minutes each day.</span>
            <span
              style={{
                display: "block",
                whiteSpace: "nowrap",
                background: "linear-gradient(135deg, #6B9BF2 0%, #8FC4B5 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              A more positive life.
            </span>
          </h2>

          <Link
            href="#start"
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
            Start your practice →
          </Link>

          <p className="mt-5 text-sm" style={{ color: "#68707A" }}>
            From $49/month · Cancel anytime · 30-day guarantee
          </p>
        </div>
      </section>

      {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer
        className="w-full"
        style={{ background: "#FAFAF8", borderTop: "1px solid rgba(221,215,207,0.55)" }}
      >
        <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-6">
            <Logo href="/" kind="full" height={22} className="opacity-45" />
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="text-xs" style={{ color: "#9AA0A8" }}>Privacy</Link>
              <Link href="/terms" className="text-xs" style={{ color: "#9AA0A8" }}>Terms</Link>
            </div>
          </div>
          <span className="text-xs" style={{ color: "#C4BDB5" }}>
            © {new Date().getFullYear()} Positives
          </span>
        </div>
      </footer>
    </div>
  );
}
