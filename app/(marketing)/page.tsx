import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Positives — A Daily Practice for Calm, Clarity & Resilience",
  description:
    "Positives is a practice-based membership guided by Dr. Paul Jenkins. A short daily habit that quietly changes how you feel over time. From $49/month.",
};

/**
 * app/(marketing)/page.tsx
 * Public landing page.
 *
 * Routing:
 *   Unauthenticated         → render landing page
 *   Authenticated, active   → /today
 *   Authenticated, inactive → render landing page (CTAs guide them to /join)
 */
export default async function LandingPage() {
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

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
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

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-28 text-center">
        <span className="text-xs font-medium text-primary uppercase tracking-widest mb-8">
          A daily practice
        </span>

        <h1 className="font-heading font-bold text-5xl sm:text-6xl text-foreground max-w-2xl leading-tight tracking-tight mb-6">
          A few minutes each day.{" "}
          <span className="text-primary">A more positive life.</span>
        </h1>

        <p className="text-muted-foreground text-lg sm:text-xl max-w-xl leading-relaxed mb-10">
          A practice-based membership guided by Dr. Paul Jenkins — built around
          one simple daily habit.
        </p>

        <Link
          href="/join"
          className="inline-flex items-center justify-center px-9 py-3.5 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors mb-4"
          style={{ boxShadow: "0 4px 20px rgba(18,20,23,0.12)" }}
        >
          Start your practice →
        </Link>

        <p className="text-xs text-muted-foreground mb-1">
          From{" "}
          <span className="text-foreground font-medium">$49/month</span>
          {" · "}Founding member rate · Cancel anytime
        </p>

        <Link
          href="/login"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-3"
        >
          Already a member? Sign in
        </Link>
      </section>

      {/* ── Dr. Paul ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 bg-card border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-5">
            Guided by
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-6">
            Dr. Paul Jenkins
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
            Dr. Paul is a psychologist, author, and speaker who has spent over
            30 years researching and teaching the science of positivity — not as
            an attitude, but as a skill. Positives is his daily methodology,
            made accessible to anyone willing to show up for five minutes.
          </p>
        </div>
      </section>

      {/* ── The Practice ─────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            The practice
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground text-center mb-14">
            Simple. Consistent. Sustainable.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                label: "Daily",
                title: "A short grounding audio",
                body: "A moment to reset before the day pulls you in every direction. Short, direct, with Dr. Paul.",
              },
              {
                label: "Weekly",
                title: "A principle and practice",
                body: "One idea to carry through your week. One thing to try. No homework. No pressure.",
              },
              {
                label: "Monthly",
                title: "A theme for reflection",
                body: "A lens for the month ahead — not a curriculum, not a course. A direction.",
              },
            ].map(({ label, title, body }) => (
              <div
                key={label}
                className="bg-card border border-border rounded-2xl p-8"
                style={{ boxShadow: "0 2px 12px rgba(18,20,23,0.05)" }}
              >
                <span className="inline-block text-xs font-medium text-primary uppercase tracking-widest mb-3">
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

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 bg-card border-t border-border">
        <div className="max-w-xl mx-auto">
          <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Membership includes
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground text-center mb-12">
            Everything you need.{" "}
            <span className="text-muted-foreground font-normal">
              Nothing you don&apos;t.
            </span>
          </h2>

          <ul className="space-y-4">
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
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="px-6 py-28 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-4">
            Start today. Come back tomorrow.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-8">
            Founding members join at $49/month — the lowest price this
            membership will ever be. Annual option available. Cancel anytime.
          </p>
          <Link
            href="/join"
            className="inline-flex items-center justify-center px-9 py-3.5 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors"
            style={{ boxShadow: "0 4px 20px rgba(18,20,23,0.12)" }}
          >
            Join Positives →
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            Secure checkout via Stripe
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="px-6 py-8 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Positives ·{" "}
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
        </p>
      </footer>

    </div>
  );
}
