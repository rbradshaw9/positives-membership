import type { Metadata } from "next";
import { config } from "@/lib/config";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import { TrialPageClient, type TrialPlanOption } from "./trial-page-client";

export const metadata: Metadata = {
  title: "Try Positives Free for 7 Days",
  description:
    "Start a 7-day free trial of Positives and begin your daily practice with Dr. Paul Jenkins.",
  alternates: {
    canonical: "/try",
  },
};

const FIRST_WEEK = [
  {
    eyebrow: "Daily rhythm",
    title: "Start each morning from a steadier place",
    body: "The daily audio gives you something calm and useful to return to before the day gets noisy.",
  },
  {
    eyebrow: "Clear structure",
    title: "Know what to come back to all week",
    body: "The weekly reflection and monthly theme keep the practice connected without turning it into a course.",
  },
  {
    eyebrow: "Real access",
    title: "Choose the level you actually want to experience",
    body: "Membership, Membership + Events, and Coaching Circle all start as real Stripe-backed trials, not watered-down previews.",
  },
] as const;

const TRIAL_STEPS = [
  {
    step: "01",
    title: "Choose the level that fits you now",
    body: "Start with core Membership, add live Events, or step into Coaching Circle if you already know you want deeper support.",
  },
  {
    step: "02",
    title: "Use it fully for the next 7 days",
    body: "You get the actual level you chose right away, including events or coaching access when that tier includes them.",
  },
  {
    step: "03",
    title: "Keep it only if the rhythm helps",
    body: "Stripe stores the card now and starts billing on day 8 unless you cancel first from the billing center in your account.",
  },
] as const;

const TRIAL_PLANS: TrialPlanOption[] = [
  {
    tier: "level_1",
    title: "Membership",
    monthlyPrice: 37,
    tagline: "Daily practice, weekly reflections, monthly themes, and the growing member library.",
    summary: "Best for someone who wants the daily Positives rhythm without adding events or coaching yet.",
    priceId: config.stripe.prices.level1Monthly,
    isLive: Boolean(config.stripe.prices.level1Monthly),
  },
  {
    tier: "level_2",
    title: "Membership + Events",
    monthlyPrice: 97,
    tagline: "Everything in Membership, plus live workshops, event access, and replays.",
    summary: "Best for someone who wants the daily practice plus a more interactive event rhythm.",
    priceId: config.stripe.prices.level2Monthly,
    isLive: Boolean(config.stripe.prices.level2Monthly),
  },
  {
    tier: "level_3",
    title: "Coaching Circle",
    monthlyPrice: 297,
    tagline: "Everything in Membership + Events, plus weekly group coaching and deeper support.",
    summary: "Best for someone who wants the full Positives experience with regular coaching built in.",
    priceId: config.stripe.prices.level3Monthly,
    isLive: Boolean(config.stripe.prices.level3Monthly),
  },
];

export default function TryPage() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;
  const signInHref = session.signInHref;
  const trialPlans = TRIAL_PLANS.map((plan) => ({
    ...plan,
    priceId: plan.priceId,
    isLive: Boolean(plan.priceId),
  }));

  return (
    <div className="min-h-dvh" style={{ background: "#F6F3EE" }}>
      <PublicSiteHeader
        signInHref={signInHref}
        signInLabel={session.signInLabel}
        primaryCtaHref={session.paidHref}
        primaryCtaLabel="View paid options"
      />

      <main>
        <section className="relative overflow-hidden border-b" style={{ borderColor: "rgba(221,215,207,0.72)" }}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.09) 0%, transparent 62%)",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:py-20">
            <div>
              <p
                className="mb-4 text-xs font-semibold uppercase"
                style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
              >
                7-day free trial
              </p>

              <h1
                className="font-heading text-4xl font-bold tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl"
                style={{ lineHeight: "1.02", textWrap: "balance", maxWidth: "12ch" }}
              >
                Try the Positives rhythm before you pay for it.
              </h1>

              <p
                className="mt-5 max-w-2xl text-base sm:text-lg"
                style={{ color: "#68707A", lineHeight: "1.78", letterSpacing: "-0.01em" }}
              >
                This page is built for the person arriving through an affiliate, partner,
                recommendation, webinar, or warmer introduction. Choose the level that fits you,
                start right away, and let the first week show you whether Positives belongs in your
                life.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  "Real access to the level you choose",
                  "No stripped-down preview experience",
                  "Cancel in Stripe before billing starts",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.5rem] border px-4 py-4"
                    style={{
                      background: "#FFFFFF",
                      borderColor: "rgba(221,215,207,0.8)",
                      boxShadow: "0 8px 24px rgba(18,20,23,0.04)",
                    }}
                  >
                    <p className="text-sm" style={{ color: "#3F4650", lineHeight: "1.7", textWrap: "balance" }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="mt-8 rounded-[1.75rem] border p-5 sm:p-6"
                style={{
                  background: "linear-gradient(180deg, rgba(47,111,237,0.05) 0%, rgba(78,140,120,0.05) 100%)",
                  borderColor: "rgba(47,111,237,0.16)",
                }}
              >
                <p className="text-xs font-semibold uppercase" style={{ color: "#2F6FED", letterSpacing: "0.14em" }}>
                  Why this offer works
                </p>
                <p className="mt-3 text-sm" style={{ color: "#4A5360", lineHeight: "1.8" }}>
                  A daily practice is hard to understand from copy alone. Seven days is enough to
                  feel the tone, the rhythm, and whether you actually want to keep coming back.
                </p>
              </div>
            </div>

            <aside
              className="rounded-[2rem] border p-6 sm:p-7"
              style={{
                background: "#FFFFFF",
                borderColor: "rgba(221,215,207,0.8)",
                boxShadow: "0 24px 80px rgba(18,20,23,0.08)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
              >
                Choose your 7-day access level
              </p>
              <h2
                className="mt-4 font-heading text-3xl font-bold tracking-[-0.045em] text-foreground"
                style={{ lineHeight: "1.08", textWrap: "balance" }}
              >
                Start with the level that matches the kind of support you want.
              </h2>
              <p className="mt-4 text-sm" style={{ color: "#68707A", lineHeight: "1.8" }}>
                Pick the version of Positives you want to experience first. The trial stays tied to
                that level, and Stripe only begins billing on day 8 if you decide to stay.
              </p>

              <TrialPageClient
                plans={trialPlans}
                hasMemberAccess={false}
                memberHref="/today"
                paidHref={session.paidHref}
              />
            </aside>
          </div>
        </section>

        <section className="border-y" style={{ borderColor: "rgba(221,215,207,0.7)" }}>
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
              >
                What the first week gives you
              </p>
              <h2
                className="mt-4 font-heading text-3xl font-bold tracking-[-0.05em] text-foreground sm:text-4xl"
                style={{ lineHeight: "1.04", textWrap: "balance" }}
              >
                Enough real use to know whether this is a rhythm you want to keep.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {FIRST_WEEK.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-[1.75rem] border p-6"
                  style={{
                    background: "#FFFFFF",
                    borderColor: "rgba(221,215,207,0.8)",
                    boxShadow: "0 10px 30px rgba(18,20,23,0.05)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase"
                    style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
                  >
                    {benefit.eyebrow}
                  </p>
                  <h3
                    className="mt-4 font-heading text-2xl font-bold tracking-[-0.04em] text-foreground"
                    style={{ lineHeight: "1.08", textWrap: "balance" }}
                  >
                    {benefit.title}
                  </h3>
                  <p className="mt-4 text-sm" style={{ color: "#68707A", lineHeight: "1.8" }}>
                    {benefit.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="border-b"
          style={{ background: "#121417", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:py-18">
            <div>
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#7DB3F7", letterSpacing: "0.14em" }}
              >
                How the trial works
              </p>
              <h2
                className="mt-4 font-heading text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl"
                style={{ lineHeight: "1.08", textWrap: "balance" }}
              >
                Simple terms. Real access. No awkward surprise on day 8.
              </h2>
            </div>

            <div className="grid gap-4">
              {TRIAL_STEPS.map((item) => (
                <article
                  key={item.step}
                  className="rounded-[1.75rem] border p-5 sm:p-6"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase"
                    style={{ color: "#7DB3F7", letterSpacing: "0.14em" }}
                  >
                    Step {item.step}
                  </p>
                  <h3
                    className="mt-3 font-heading text-2xl font-bold tracking-[-0.04em] text-white"
                    style={{ lineHeight: "1.08", textWrap: "balance" }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.72)", lineHeight: "1.8" }}>
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 lg:py-20">
            <p
              className="text-xs font-semibold uppercase"
              style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
            >
              A warmer way in
            </p>
            <h2
              className="mx-auto mt-4 max-w-3xl font-heading text-3xl font-bold tracking-[-0.045em] text-foreground sm:text-4xl"
              style={{ lineHeight: "1.08", textWrap: "balance" }}
            >
              This page exists for the person who wants to feel the practice first.
            </h2>
            <p
              className="mx-auto mt-5 max-w-3xl text-base"
              style={{ color: "#68707A", lineHeight: "1.8", letterSpacing: "-0.01em" }}
            >
              Some people are ready to buy right away. Some want a week of real use before they
              decide. This trial is for that second path.
            </p>

            <div
              className="mx-auto mt-8 rounded-[1.75rem] border p-5 sm:p-6"
              style={{
                maxWidth: "42rem",
                background: "#FFFFFF",
                borderColor: "rgba(221,215,207,0.8)",
                boxShadow: "0 10px 30px rgba(18,20,23,0.05)",
              }}
            >
              <p className="text-sm" style={{ color: "#4A5360", lineHeight: "1.8" }}>
                Card required today. Stripe stores it now and begins billing on day 8 for the
                level you choose unless you cancel first in the billing center.
              </p>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter paidHref={session.paidHref} session={session} />
    </div>
  );
}
