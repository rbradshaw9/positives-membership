import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import { PricingToggle } from "@/components/marketing/PricingToggle";

export const metadata = {
  title: "Join Positives — Choose Your Membership",
  description:
    "Start your Positives membership from $49/month. Daily grounding audio, weekly principles, and monthly themes guided by Dr. Paul Jenkins.",
};

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
  const monthlyPriceId = config.stripe.prices.level1Monthly;
  const annualPriceId = config.stripe.prices.level1Annual;

  // ── Check-email holding screen ────────────────────────────────────────────
  if (step === "check-email") {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          <div
            className="bg-card border border-border rounded-2xl p-8 mb-6"
            style={{ boxShadow: "0 6px 24px rgba(18,20,23,0.06)" }}
          >
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 mx-auto">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <polyline points="22 7 12 13 2 7" />
              </svg>
            </span>
            <h1 className="font-heading font-bold text-xl text-foreground mb-2">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a sign-in link to{" "}
              <span className="text-foreground font-medium">
                {emailParam ?? "your email"}
              </span>
              . Click it to complete your account and start checkout.
            </p>
          </div>
          <a
            href="/join"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to join
          </a>
        </div>
      </div>
    );
  }

  // ── Main join page ────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F6F3EE" }}>

      {/* ── Nav — matches homepage ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(246,243,238,0.82)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(221,215,207,0.5)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-heading font-bold text-xl transition-opacity hover:opacity-70"
            style={{ color: "#121417", letterSpacing: "-0.04em" }}
          >
            Positives
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium transition-colors"
            style={{ color: "#68707A" }}
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ── Pricing header ───────────────────────────────────────────────── */}
      <section className="px-6 pt-16 pb-10 text-center">
        <p
          className="text-xs font-semibold uppercase mb-4"
          style={{ color: "#68707A", letterSpacing: "0.14em" }}
        >
          Choose your level
        </p>
        <h1
          className="font-heading font-bold mb-3"
          style={{
            fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
            letterSpacing: "-0.04em",
            lineHeight: "1.08",
            color: "#121417",
          }}
        >
          Start your Positives practice.
        </h1>
        <p
          className="text-sm"
          style={{ color: "#68707A", letterSpacing: "-0.01em" }}
        >
          Founding member rate · Cancel anytime · Secure checkout via Stripe
        </p>
      </section>

      {/* ── Pricing toggle + cards + auth gate ───────────────────────────── */}
      <section className="px-6 pb-24 max-w-5xl mx-auto w-full">
        <PricingToggle
          isAuthenticated={!!user}
          userEmail={user?.email ?? null}
          initialError={errorParam ?? null}
          monthlyPriceId={monthlyPriceId}
          annualPriceId={annualPriceId}
        />
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="w-full px-6 py-7 mt-auto"
        style={{ borderTop: "1px solid rgba(221,215,207,0.5)", background: "#F6F3EE" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "#68707A" }}>
            © {new Date().getFullYear()} Positives
          </span>
          <Link
            href="/"
            className="text-xs font-medium transition-colors"
            style={{ color: "#68707A" }}
          >
            Back to home
          </Link>
        </div>
      </footer>

    </div>
  );
}
