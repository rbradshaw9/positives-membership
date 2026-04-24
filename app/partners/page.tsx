import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { PublicTrackedLink } from "@/components/marketing/PublicTrackedLink";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";

export const metadata: Metadata = {
  title: "Partner Program — Positives",
  description:
    "Learn who the Positives partner program is for, how approvals work, and how to apply without becoming a paid member first.",
  alternates: {
    canonical: "/partners",
  },
};

const PARTNER_TYPES = [
  {
    title: "Member partners",
    body:
      "People already using Positives who want to recommend it naturally from lived experience.",
  },
  {
    title: "Coach or creator partners",
    body:
      "Trusted voices with an audience that would genuinely benefit from a calm daily practice.",
  },
  {
    title: "Strategic partners",
    body:
      "Webinar hosts, podcasts, organizations, or collaborators running a more intentional campaign.",
  },
];

const PARTNER_STEPS = [
  "Apply with a short description of who you serve and how you would share Positives.",
  "We review for fit, clarity, and brand safety before activating your partner access.",
  "Approved partners get their tracking links, payout setup, and a clean portal inside Positives.",
];

const PARTNER_BENEFITS = [
  "A simple partner dashboard with links, clicks, leads, and conversions",
  "FirstPromoter-powered tracking and payout support underneath",
  "Share-kit copy so you are not starting from scratch each time",
  "A calm, trust-based program instead of hype-heavy affiliate tactics",
];

export default function PartnersPage() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F7F5F0" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        navLinks={[
          { href: "/", label: "Home" },
          { href: "/faq", label: "FAQ" },
          { href: "/affiliate-program", label: "Terms", hiddenOnMobile: true },
        ]}
        primaryCtaHref="/partners/apply"
        primaryCtaLabel="Apply now"
      />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at top, rgba(78,140,120,0.14), transparent 48%), linear-gradient(180deg, rgba(255,255,255,0.62), rgba(247,245,240,0.96))",
            }}
          />
          <div
            className="relative max-w-6xl mx-auto px-5 sm:px-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]"
            style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(3rem, 6vw, 5rem)" }}
          >
            <div>
              <p
                className="text-xs font-semibold uppercase mb-5"
                style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
              >
                Partner Program
              </p>
              <h1
                className="font-heading font-bold mb-5"
                style={{
                  fontSize: "clamp(2.3rem, 5.6vw, 4.6rem)",
                  letterSpacing: "-0.05em",
                  lineHeight: "1.02",
                  color: "#121417",
                  textWrap: "balance",
                  maxWidth: "11ch",
                }}
              >
                Share Positives in a way that feels natural.
              </h1>
              <p
                style={{
                  fontSize: "1.05rem",
                  color: "#5F6670",
                  lineHeight: "1.78",
                  maxWidth: "40rem",
                }}
              >
                The Positives partner program is for people who already have trust
                with an audience and want a simple, credible way to recommend a
                steady daily practice with Dr. Paul Jenkins.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <PublicTrackedLink
                  href="/partners/apply"
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
                  style={{
                    background: "#4E8C78",
                    color: "#FFFFFF",
                    boxShadow: "0 16px 32px rgba(78,140,120,0.22)",
                  }}
                >
                  Apply to partner
                </PublicTrackedLink>
                <PublicTrackedLink
                  href="/affiliate-program"
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.88)",
                    color: "#121417",
                    border: "1px solid rgba(18,20,23,0.08)",
                  }}
                >
                  Review terms
                </PublicTrackedLink>
              </div>
            </div>

            <div
              className="rounded-[2rem] p-6 sm:p-7"
              style={{
                background: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(221,215,207,0.7)",
                boxShadow: "0 18px 48px rgba(18,20,23,0.08)",
                backdropFilter: "blur(10px)",
              }}
            >
              <p className="text-xs font-semibold uppercase mb-4" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
                How it works
              </p>
              <div className="space-y-4">
                {PARTNER_STEPS.map((step, index) => (
                  <div key={step} className="flex gap-4 items-start">
                    <div
                      className="shrink-0 rounded-2xl flex items-center justify-center font-semibold"
                      style={{
                        width: "2.5rem",
                        height: "2.5rem",
                        background: "rgba(78,140,120,0.12)",
                        color: "#4E8C78",
                      }}
                    >
                      {index + 1}
                    </div>
                    <p style={{ color: "#5F6670", lineHeight: "1.72" }}>{step}</p>
                  </div>
                ))}
              </div>
              <div
                className="rounded-[1.5rem] p-5 mt-6"
                style={{ background: "#121417", color: "#F7F5F0" }}
              >
                <p className="font-semibold mb-2" style={{ textWrap: "balance" }}>
                  This is not a spammy affiliate program.
                </p>
                <p style={{ color: "rgba(247,245,240,0.78)", lineHeight: "1.72" }}>
                  We care much more about trusted recommendation, payout hygiene,
                  and brand fit than about letting everyone in instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full" style={{ paddingBottom: "clamp(2rem, 5vw, 4rem)" }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="grid gap-4 md:grid-cols-3">
              {PARTNER_TYPES.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.75rem] p-6"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(221,215,207,0.72)",
                    boxShadow: "0 8px 24px rgba(18,20,23,0.05)",
                  }}
                >
                  <p className="font-heading font-semibold mb-3" style={{ fontSize: "1.1rem", color: "#121417", textWrap: "balance" }}>
                    {item.title}
                  </p>
                  <p style={{ color: "#68707A", lineHeight: "1.72" }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full" style={{ paddingBottom: "clamp(3rem, 6vw, 5rem)" }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div
              className="rounded-[2rem] p-7"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(221,215,207,0.72)",
                boxShadow: "0 10px 32px rgba(18,20,23,0.05)",
              }}
            >
              <p className="text-xs font-semibold uppercase mb-4" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
                Good fit
              </p>
              <h2
                className="font-heading font-bold mb-4"
                style={{
                  fontSize: "clamp(1.7rem, 4vw, 2.5rem)",
                  lineHeight: "1.08",
                  letterSpacing: "-0.04em",
                  color: "#121417",
                  textWrap: "balance",
                }}
              >
                Partners who already have trust tend to do best.
              </h2>
              <p style={{ color: "#68707A", lineHeight: "1.76", marginBottom: "1rem" }}>
                We are looking for people who can recommend Positives in a grounded,
                relevant way, not people trying to force a generic link into every
                channel they can find.
              </p>
              <ul className="space-y-3 pl-5 list-disc" style={{ color: "#68707A", lineHeight: "1.72" }}>
                <li>You know who Positives is a fit for.</li>
                <li>You can speak from real experience or real trust.</li>
                <li>You want a simple system for links, payouts, and follow-through.</li>
                <li>You are comfortable with clear terms and brand standards.</li>
              </ul>
            </div>

            <div
              className="rounded-[2rem] p-7"
              style={{
                background: "linear-gradient(160deg, #F3EFE7 0%, #FFFFFF 100%)",
                border: "1px solid rgba(221,215,207,0.8)",
                boxShadow: "0 10px 36px rgba(18,20,23,0.05)",
              }}
            >
              <p className="text-xs font-semibold uppercase mb-4" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
                Approved partners get
              </p>
              <div className="grid gap-3">
                {PARTNER_BENEFITS.map((benefit) => (
                  <div
                    key={benefit}
                    className="rounded-[1.25rem] px-4 py-4"
                    style={{ background: "rgba(255,255,255,0.86)", border: "1px solid rgba(18,20,23,0.06)" }}
                  >
                    <p style={{ color: "#4A5360", lineHeight: "1.68" }}>{benefit}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <PublicTrackedLink
                  href="/partners/apply"
                  className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                  style={{ background: "#121417", color: "#FFFFFF" }}
                >
                  Start application
                </PublicTrackedLink>
                <a
                  href="mailto:support@positives.life?subject=Positives%20partner%20question"
                  className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                  style={{ color: "#2F6FED", background: "rgba(47,111,237,0.08)" }}
                >
                  Ask a question
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter
        paidHref={session.paidHref}
        session={session}
      />
    </div>
  );
}
