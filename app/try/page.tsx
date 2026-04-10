import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { Logo } from "@/components/marketing/Logo";
import { appendPublicTrackingParams, type PublicSearchParams } from "@/lib/marketing/public-query-params";
import { getPublicSessionState } from "@/lib/marketing/public-session";
import { TrialPageClient, type TrialPlanOption } from "./trial-page-client";

export const metadata: Metadata = {
  title: "Try Positives Free for 7 Days",
  description:
    "Start a 7-day free trial of Positives and begin your daily practice with Dr. Paul Jenkins.",
  alternates: {
    canonical: "/try",
  },
};

const BENEFITS = [
  {
    eyebrow: "Daily",
    title: "A grounded start every morning",
    body: "Each day opens with a short audio from Dr. Paul so you can reset before the world gets loud.",
  },
  {
    eyebrow: "Weekly",
    title: "A simple frame for the week ahead",
    body: "Your weekly principle gives the whole week one clear idea to return to when you need it.",
  },
  {
    eyebrow: "Monthly",
    title: "A deeper theme tying it all together",
    body: "Each month carries one bigger focus so your practice feels connected instead of random.",
  },
];

const TRIAL_PLANS: TrialPlanOption[] = [
  {
    tier: "level_1",
    title: "Membership",
    monthlyPrice: 37,
    tagline: "Daily practice, weekly reflections, monthly themes, and the full core library.",
    summary: "Best for someone who wants the full daily Positives rhythm without adding events or coaching yet.",
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

export default async function TryPage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  const session = await getPublicSessionState();
  const resolvedSearchParams = await searchParams;
  const signInHref = session.signInHref;
  const paidHref = appendPublicTrackingParams(session.paidHref, resolvedSearchParams);
  const trialPlans = TRIAL_PLANS.map((plan) => ({
    ...plan,
    priceId: plan.priceId,
    isLive: Boolean(plan.priceId),
  }));

  return (
    <div className="min-h-dvh" style={{ background: "#F6F3EE" }}>
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(246,243,238,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.65)",
        }}
        >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8 sm:py-4">
          <Logo kind="wordmark" height={24} />
          <div className="flex items-center gap-3">
            <Link href={signInHref} className="text-sm font-medium" style={{ color: "#68707A" }}>
              {session.signInLabel}
            </Link>
            <Link
              href={paidHref}
              className="rounded-full px-4 py-2 text-sm font-semibold sm:px-5 sm:py-2.5"
              style={{
                background: "#FFFFFF",
                color: "#121417",
                border: "1px solid rgba(18,20,23,0.12)",
              }}
            >
              {session.hasMemberAccess ? "Open Today" : "View paid options"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.09) 0%, transparent 62%)",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:py-20">
            <div>
              <p
                className="mb-4 text-xs font-semibold uppercase"
                style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
              >
                7-day trial · choose your level
              </p>

              <h1
                className="font-heading text-4xl font-bold tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl"
                style={{ lineHeight: "1.02", textWrap: "balance" }}
              >
                Try Positives free for 7 days and feel the rhythm before you commit.
              </h1>

              <p
                className="mt-5 max-w-2xl text-base sm:text-lg"
                style={{ color: "#68707A", lineHeight: "1.78", letterSpacing: "-0.01em" }}
              >
                This is a real Stripe subscription trial, not a stripped-down preview. Choose the
                level that fits you, start with full access right away, and let the first week show
                you whether the rhythm belongs in your life.
              </p>

              <TrialPageClient
                plans={trialPlans}
                hasMemberAccess={session.hasMemberAccess}
                memberHref="/today"
                paidHref={paidHref}
              />
            </div>

            <aside
              className="rounded-[2rem] border p-6 sm:p-7"
              style={{
                background: "#10151D",
                borderColor: "rgba(18,20,23,0.08)",
                boxShadow: "0 24px 80px rgba(18,20,23,0.12)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase"
                style={{ color: "#7DB3F7", letterSpacing: "0.14em" }}
              >
                What happens after day 7
              </p>

              <div className="mt-5 space-y-4">
                {[
                  "You choose Membership, Membership + Events, or Coaching Circle before checkout.",
                  "Stripe keeps that same subscription running in the background from day one.",
                  "On day 8, billing starts automatically for the level you chose unless you cancel first.",
                  "You can cancel the trial anytime from the billing center inside your account.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div
                      className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7DB3F7" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.72)", lineHeight: "1.75" }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="mt-8 rounded-[1.5rem] border p-5"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="text-xs font-semibold uppercase" style={{ color: "#9AA0A8", letterSpacing: "0.12em" }}>
                  Better fit for
                </p>
                <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.72)", lineHeight: "1.72" }}>
                  Someone who wants to experience the Positives rhythm before paying, especially if
                  they found it through an affiliate, creator, webinar, or colder introduction.
                </p>
              </div>
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
                Inside the trial
              </p>
              <h2
                className="mt-4 font-heading text-3xl font-bold tracking-[-0.05em] text-foreground sm:text-4xl"
                style={{ lineHeight: "1.04", textWrap: "balance" }}
              >
                Enough access to know whether this rhythm belongs in your life.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {BENEFITS.map((benefit) => (
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

        <section>
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              <div>
                <p
                  className="text-xs font-semibold uppercase"
                  style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
                >
                  Trial FAQ
                </p>
                <h2
                  className="mt-4 font-heading text-3xl font-bold tracking-[-0.05em] text-foreground sm:text-4xl"
                  style={{ lineHeight: "1.04", textWrap: "balance" }}
                >
                  Clear terms. No sneaky edges.
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  [
                    "When do I get billed?",
                    "Your card is collected today, but Stripe does not charge you until the 7-day trial finishes. The amount depends on the level you choose.",
                  ],
                  [
                    "Do I need a card to start?",
                    "Yes. This is a real Stripe subscription trial so it can continue automatically if you decide to stay.",
                  ],
                  [
                    "How do I cancel before billing starts?",
                    "Open the billing center from your account and cancel there. The cancellation is handled by Stripe and takes effect before the trial converts.",
                  ],
                  [
                    "Can I start with Events or Coaching?",
                    "Yes. In this funnel you can start a 7-day trial of Membership, Membership + Events, or Coaching Circle and keep that same level if you stay in.",
                  ],
                ].map(([question, answer]) => (
                  <article
                    key={question}
                    className="rounded-[1.5rem] border p-5 sm:p-6"
                    style={{ background: "#FFFFFF", borderColor: "rgba(221,215,207,0.8)" }}
                  >
                    <h3
                      className="font-heading text-xl font-bold tracking-[-0.03em] text-foreground"
                      style={{ textWrap: "balance" }}
                    >
                      {question}
                    </h3>
                    <p className="mt-3 text-sm" style={{ color: "#68707A", lineHeight: "1.8" }}>
                      {answer}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
