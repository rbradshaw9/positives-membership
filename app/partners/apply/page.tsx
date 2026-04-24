import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";
import {
  appendPublicTrackingParams,
  type PublicSearchParams,
} from "@/lib/marketing/public-query-params";
import { PartnerApplyForm } from "./PartnerApplyForm";

export const metadata: Metadata = {
  title: "Apply to Partner — Positives",
  description:
    "Apply to the Positives partner program and tell us who you serve, how you would share Positives, and why you are a strong fit.",
  alternates: {
    canonical: "/partners/apply",
  },
};

export default async function PartnerApplyPage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  const trackingParams = await searchParams;
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;
  const trackedPartnerPageHref = appendPublicTrackingParams(
    "/partners",
    trackingParams
  );
  const trackedAffiliateTermsHref = appendPublicTrackingParams(
    "/affiliate-program",
    trackingParams
  );

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F7F5F0" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        trackingParams={trackingParams}
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
          <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <p
                className="mb-5 text-xs font-semibold uppercase"
                style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
              >
                Partner application
              </p>
              <h1
                className="font-heading mb-5 font-bold"
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
                className="mt-8 rounded-[1.75rem] p-6"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(221,215,207,0.72)",
                  boxShadow: "0 10px 28px rgba(18,20,23,0.05)",
                }}
              >
                <p className="mb-3 font-semibold" style={{ color: "#121417", textWrap: "balance" }}>
                  Good applications usually make three things obvious.
                </p>
                <ul className="list-disc space-y-3 pl-5" style={{ color: "#68707A", lineHeight: "1.72" }}>
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
              <PartnerApplyForm
                partnerPageHref={trackedPartnerPageHref}
                affiliateTermsHref={trackedAffiliateTermsHref}
              />
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter
        paidHref={session.paidHref}
        session={session}
        trackingParams={trackingParams}
      />
    </div>
  );
}
