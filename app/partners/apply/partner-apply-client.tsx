"use client";

import { useActionState, useEffect } from "react";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { PublicTrackedLink } from "@/components/marketing/PublicTrackedLink";
import type { PublicSessionState } from "@/lib/marketing/public-session";
import { track } from "@/lib/analytics/ga";
import {
  submitPartnerApplication,
  type PartnerApplicationFormState,
} from "./actions";

const initialState: PartnerApplicationFormState = { status: "idle" };

const PARTNER_OPTIONS = [
  { value: "member_partner", label: "Current Positives member" },
  { value: "coach_or_creator", label: "Coach, creator, or trusted recommender" },
  { value: "strategic_partner", label: "Webinar, podcast, or strategic partner" },
  { value: "other", label: "Something else" },
];

export default function PartnerApplyClient({
  session,
}: {
  session: Pick<
    PublicSessionState,
    "paidHref" | "paidShortLabel" | "signInHref" | "signInLabel"
  >;
}) {
  const [state, formAction, isPending] = useActionState(
    submitPartnerApplication,
    initialState
  );

  useEffect(() => {
    if (state.status === "sent") {
      track("partner_application_submitted", {
        source_path: "/partners/apply",
      });
      return;
    }

    if (state.status === "error") {
      track("partner_application_submit_failed", {
        source_path: "/partners/apply",
      });
    }
  }, [state.status]);

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F7F5F0" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        navLinks={[
          { href: "/", label: "Home" },
          { href: "/partners", label: "Partner program" },
          { href: "/affiliate-program", label: "Terms", hiddenOnMobile: true },
        ]}
        primaryCtaHref={session.paidHref}
        primaryCtaLabel={session.paidShortLabel}
      />

      <main className="flex-1">
        <section
          className="w-full"
          style={{ paddingTop: "clamp(3.5rem, 7vw, 6rem)", paddingBottom: "clamp(4rem, 8vw, 7rem)" }}
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-8 grid gap-12 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <p
                className="text-xs font-semibold uppercase mb-5"
                style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
              >
                Partner application
              </p>
              <h1
                className="font-heading font-bold mb-5"
                style={{
                  fontSize: "clamp(2rem, 4.8vw, 3.9rem)",
                  letterSpacing: "-0.045em",
                  lineHeight: "1.05",
                  color: "#121417",
                  textWrap: "balance",
                  maxWidth: "12ch",
                }}
              >
                Tell us who you serve and why Positives fits.
              </h1>
              <p style={{ color: "#68707A", lineHeight: "1.76", maxWidth: "35rem" }}>
                We review partner applications manually so the program stays
                aligned with trust, fit, and clean promotion. You do not need to
                be a paying member to apply.
              </p>

              <div
                className="rounded-[1.75rem] p-6 mt-8"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(221,215,207,0.72)",
                  boxShadow: "0 10px 28px rgba(18,20,23,0.05)",
                }}
              >
                <p className="font-semibold mb-3" style={{ color: "#121417", textWrap: "balance" }}>
                  Good applications usually make three things obvious.
                </p>
                <ul className="space-y-3 pl-5 list-disc" style={{ color: "#68707A", lineHeight: "1.72" }}>
                  <li>You already have trust with the people you would share this with.</li>
                  <li>You can describe why Positives is relevant without forcing it.</li>
                  <li>You are comfortable with approval, terms, and payout setup.</li>
                </ul>
                <p className="mt-4 text-sm" style={{ color: "#9AA0A8", lineHeight: "1.68" }}>
                  Questions first?{" "}
                  <a
                    href="mailto:support@positives.life?subject=Positives%20partner%20question"
                    className="underline underline-offset-2"
                    style={{ color: "#2F6FED" }}
                  >
                    support@positives.life
                  </a>
                </p>
              </div>
            </div>

            <div>
              {state.status === "sent" ? (
                <div
                  className="rounded-[2rem] p-10 text-center"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(78,140,120,0.28)",
                    boxShadow: "0 18px 36px rgba(18,20,23,0.06)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-[1.25rem] mx-auto mb-5 flex items-center justify-center"
                    style={{ background: "rgba(78,140,120,0.12)" }}
                    aria-hidden="true"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2
                    className="font-heading font-bold mb-3"
                    style={{
                      fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
                      color: "#121417",
                      letterSpacing: "-0.035em",
                      textWrap: "balance",
                    }}
                  >
                    Application received.
                  </h2>
                  <p style={{ color: "#68707A", lineHeight: "1.76", maxWidth: "31rem", margin: "0 auto" }}>
                    Thanks for applying. We&apos;ll review your fit and follow up by
                    email. If approved, we&apos;ll help you get partner access and
                    payout setup moving cleanly.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 mt-7">
                    <PublicTrackedLink
                      href="/partners"
                      className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                      style={{ background: "#121417", color: "#FFFFFF" }}
                    >
                      Back to partner page
                    </PublicTrackedLink>
                    <PublicTrackedLink
                      href="/affiliate-program"
                      className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                      style={{ background: "rgba(47,111,237,0.08)", color: "#2F6FED" }}
                    >
                      Review terms
                    </PublicTrackedLink>
                  </div>
                </div>
              ) : (
                <form
                  action={formAction}
                  className="rounded-[2rem] p-7 sm:p-8 space-y-5"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(221,215,207,0.72)",
                    boxShadow: "0 18px 36px rgba(18,20,23,0.06)",
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "-9999px",
                      width: "1px",
                      height: "1px",
                      overflow: "hidden",
                    }}
                  >
                    <label htmlFor="partner-company">Company</label>
                    <input
                      id="partner-company"
                      name="company"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="partner-name" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                        Name
                      </label>
                      <input
                        id="partner-name"
                        name="name"
                        type="text"
                        required
                        placeholder="Your name"
                        className="w-full rounded-2xl px-4 py-3 text-sm"
                        style={{ border: "1px solid rgba(154,160,168,0.35)", background: "#FCFCFA" }}
                      />
                    </div>
                    <div>
                      <label htmlFor="partner-email" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                        Email
                      </label>
                      <input
                        id="partner-email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-2xl px-4 py-3 text-sm"
                        style={{ border: "1px solid rgba(154,160,168,0.35)", background: "#FCFCFA" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="partner-type" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                      Partner type
                    </label>
                    <select
                      id="partner-type"
                      name="partnerType"
                      defaultValue="member_partner"
                      className="w-full rounded-2xl px-4 py-3 text-sm"
                      style={{ border: "1px solid rgba(154,160,168,0.35)", background: "#FCFCFA" }}
                    >
                      {PARTNER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="partner-audience" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                      Who would you share Positives with?
                    </label>
                    <textarea
                      id="partner-audience"
                      name="audienceSummary"
                      required
                      rows={3}
                      placeholder="A short summary of your audience, clients, community, or relationships."
                      className="w-full rounded-[1.5rem] px-4 py-3 text-sm"
                      style={{ border: "1px solid rgba(154,160,168,0.35)", background: "#FCFCFA", resize: "vertical" }}
                    />
                  </div>

                  <div>
                    <label htmlFor="partner-website" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                      Website or public profile
                    </label>
                    <input
                      id="partner-website"
                      name="websiteUrl"
                      type="url"
                      placeholder="https://..."
                      className="w-full rounded-2xl px-4 py-3 text-sm"
                      style={{ border: "1px solid rgba(154,160,168,0.35)", background: "#FCFCFA" }}
                    />
                  </div>

                  <div>
                    <label htmlFor="partner-message" className="block text-sm font-medium mb-1.5" style={{ color: "#121417" }}>
                      Why are you a good fit?
                    </label>
                    <textarea
                      id="partner-message"
                      name="message"
                      required
                      rows={6}
                      placeholder="Tell us how you would share Positives and why it would feel relevant for your audience."
                      className="w-full rounded-[1.5rem] px-4 py-3 text-sm"
                      style={{ border: "1px solid rgba(154,160,168,0.35)", background: "#FCFCFA", resize: "vertical" }}
                    />
                  </div>

                  <label className="flex items-start gap-3 text-sm" style={{ color: "#68707A", lineHeight: "1.68" }}>
                    <input
                      type="checkbox"
                      name="agreedToTerms"
                      required
                      className="mt-1"
                    />
                    <span>
                      I agree to the{" "}
                      <PublicTrackedLink
                        href="/affiliate-program"
                        className="underline underline-offset-2"
                        style={{ color: "#2F6FED" }}
                      >
                        affiliate program terms
                      </PublicTrackedLink>{" "}
                      and understand that partner approval is reviewed manually.
                    </span>
                  </label>

                  {state.status === "error" ? (
                    <p
                      className="rounded-2xl px-4 py-3 text-sm"
                      role="alert"
                      style={{ background: "rgba(180,78,78,0.1)", color: "#8C4343" }}
                    >
                      {state.message}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-opacity"
                    style={{
                      background: isPending ? "rgba(78,140,120,0.6)" : "#4E8C78",
                      color: "#FFFFFF",
                      boxShadow: "0 18px 36px rgba(78,140,120,0.18)",
                    }}
                  >
                    {isPending ? "Submitting..." : "Submit application"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter paidHref={session.paidHref} session={session} />
    </div>
  );
}
