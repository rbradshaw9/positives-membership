import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Positives — A Daily Practice for Calm, Clarity & Resilience",
  description:
    "Positives is a practice-based membership with daily grounding audio, weekly principles, and monthly themes guided by Dr. Paul Jenkins. $49/month.",
};

/**
 * app/(marketing)/page.tsx
 * Public landing page — the first thing a new visitor sees.
 *
 * Routing logic:
 * - Unauthenticated           → render this landing page
 * - Authenticated, active     → /today
 * - Authenticated, inactive   → /join
 *
 * This page is intentionally calm, focused, and conversion-oriented.
 * It does NOT redirect to /login. Visitors see the product first.
 */
export default async function LandingPage() {
  // Active members go directly to their dashboard.
  // Everyone else — unauthenticated or inactive — sees the landing page.
  // The landing page CTAs route them to /join when they're ready.
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

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="px-6 py-4 flex items-center justify-between">
        <span className="font-heading font-bold text-lg tracking-tight text-foreground">
          Positives
        </span>
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </Link>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-8 tracking-wide uppercase">
          A daily practice
        </span>

        <h1 className="font-heading font-bold text-4xl sm:text-5xl md:text-6xl text-foreground max-w-2xl leading-tight tracking-tight mb-6">
          Calm, clarity, and resilience —{" "}
          <span className="text-primary">every day.</span>
        </h1>

        <p className="text-muted-foreground text-lg sm:text-xl max-w-xl leading-relaxed mb-10">
          Positives is a practice-based membership guided by Dr. Paul Jenkins.
          A short daily habit that quietly changes how you feel over time.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Link
            href="/join"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
          >
            Start your practice →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
          >
            Sign in
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="line-through">$97/month</span>
          {" — "}
          <span className="text-foreground font-medium">$49/month</span>
          {" · "} Founding member rate · Cancel anytime
        </p>
      </section>

      {/* ── About Dr. Paul ───────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-card border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Guided by
          </p>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-4">
            Dr. Paul Jenkins
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
            Psychologist, author, and coach. Dr. Paul has spent over 30 years
            helping people cultivate lasting positivity — not as a mood, but as
            a practiced skill. Positives is his daily methodology, made
            accessible.
          </p>
        </div>
      </section>

      {/* ── The Rhythm ───────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            The practice
          </p>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground text-center mb-12">
            Simple. Consistent. Sustainable.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                label: "Daily",
                title: "A short grounding audio",
                body: "Each day begins with a short audio from Dr. Paul — a moment to reset, reframe, and return to yourself.",
              },
              {
                label: "Weekly",
                title: "A principle and practice",
                body: "Each week, a guiding principle and a simple practice to carry through your day. No homework. No pressure.",
              },
              {
                label: "Monthly",
                title: "A theme for reflection",
                body: "Each month has a theme designed to build the skills of positivity without rushing or forcing anything.",
              },
            ].map(({ label, title, body }) => (
              <div
                key={label}
                className="bg-card border border-border rounded-2xl p-6"
                style={{ boxShadow: "0 6px 24px rgba(18,20,23,0.05)" }}
              >
                <span className="inline-block text-xs font-medium text-primary uppercase tracking-wide mb-3">
                  {label}
                </span>
                <h3 className="font-heading font-semibold text-base text-foreground mb-2 leading-snug">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get ─────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-surface-tint border-t border-border">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Membership includes
          </p>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground text-center mb-10">
            Everything you need, nothing you don&apos;t.
          </h2>

          <ul className="space-y-4 mb-12">
            {[
              "Daily grounding audio from Dr. Paul",
              "Weekly principles and practices",
              "Monthly themes for reflection",
              "Full content library",
              "Private member podcast feed",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-foreground text-sm sm:text-base leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          {/* Pricing */}
          <div className="bg-card border border-border rounded-2xl p-8 text-center"
            style={{ boxShadow: "0 6px 24px rgba(18,20,23,0.05)" }}
          >
            <p className="text-sm text-muted-foreground mb-1">
              Founding member rate
            </p>
            <div className="flex items-baseline justify-center gap-2 mb-1">
              <span className="text-muted-foreground text-sm line-through">
                $97
              </span>
              <span className="font-heading font-bold text-4xl text-foreground">
                $49
              </span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Cancel anytime. No contracts.
            </p>
            <Link
              href="/join"
              className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors"
              style={{ boxShadow: "0 6px 24px rgba(18,20,23,0.05)" }}
            >
              Join Positives →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="px-6 py-8 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Positives · Secure checkout by Stripe ·{" "}
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}
