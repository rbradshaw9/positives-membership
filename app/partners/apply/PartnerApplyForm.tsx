"use client";

import { useActionState, useEffect } from "react";
import { track } from "@/lib/analytics/ga";
import { PublicTrackedLink } from "@/components/marketing/PublicTrackedLink";
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

export function PartnerApplyForm({
  partnerPageHref,
  affiliateTermsHref,
}: {
  partnerPageHref: string;
  affiliateTermsHref: string;
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

  if (state.status === "sent") {
    return (
      <div
        className="rounded-[2rem] p-10 text-center"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(78,140,120,0.28)",
          boxShadow: "0 18px 36px rgba(18,20,23,0.06)",
        }}
      >
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[1.25rem]"
          style={{ background: "rgba(78,140,120,0.12)" }}
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2
          className="font-heading mb-3 font-bold"
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
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <PublicTrackedLink
            href={partnerPageHref}
            className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
            style={{ background: "#121417", color: "#FFFFFF" }}
          >
            Back to partner page
          </PublicTrackedLink>
          <PublicTrackedLink
            href={affiliateTermsHref}
            className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
            style={{ background: "rgba(47,111,237,0.08)", color: "#2F6FED" }}
          >
            Review terms
          </PublicTrackedLink>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-[2rem] p-7 sm:p-8"
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="partner-name" className="mb-1.5 block text-sm font-medium" style={{ color: "#121417" }}>
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
          <label htmlFor="partner-email" className="mb-1.5 block text-sm font-medium" style={{ color: "#121417" }}>
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
        <label htmlFor="partner-type" className="mb-1.5 block text-sm font-medium" style={{ color: "#121417" }}>
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
        <label htmlFor="partner-audience" className="mb-1.5 block text-sm font-medium" style={{ color: "#121417" }}>
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
        <label htmlFor="partner-website" className="mb-1.5 block text-sm font-medium" style={{ color: "#121417" }}>
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
        <label htmlFor="partner-message" className="mb-1.5 block text-sm font-medium" style={{ color: "#121417" }}>
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
            href={affiliateTermsHref}
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
  );
}
