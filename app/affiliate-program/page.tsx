import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { getPublicSessionState } from "@/lib/marketing/public-session";

export const metadata: Metadata = {
  title: "Affiliate Program Terms — Positives",
  description:
    "The Positives affiliate program rules, payout expectations, referral standards, and prohibited behavior.",
  alternates: {
    canonical: "/affiliate-program",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="font-heading font-semibold mb-4"
        style={{
          fontSize: "1.25rem",
          color: "#121417",
          letterSpacing: "-0.02em",
          textWrap: "balance",
        }}
      >
        {title}
      </h2>
      <div style={{ color: "#4A5360", lineHeight: "1.8" }}>{children}</div>
    </section>
  );
}

export default async function AffiliateProgramPage() {
  const session = await getPublicSessionState();
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#FAFAF8" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        navLinks={[
          { href: "/", label: "Home" },
          { href: "/support", label: "Support" },
          { href: "/faq", label: "FAQ", hiddenOnMobile: true },
        ]}
        primaryCtaHref={session.paidHref}
        primaryCtaLabel={session.paidShortLabel}
      />

      <main className="flex-1 w-full">
        <div
          className="max-w-3xl mx-auto px-8"
          style={{
            paddingTop: "clamp(4rem, 8vw, 7rem)",
            paddingBottom: "clamp(4rem, 8vw, 7rem)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase mb-6"
            style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}
          >
            Affiliate Program
          </p>
          <h1
            className="font-heading font-bold mb-3"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.045em",
              lineHeight: "1.06",
              color: "#121417",
              textWrap: "balance",
            }}
          >
            Positives Affiliate Program Terms
          </h1>
          <p className="mb-4 text-sm" style={{ color: "#9AA0A8" }}>
            Last updated: {lastUpdated}
          </p>
          <p
            style={{
              fontSize: "1.025rem",
              color: "#4A5360",
              lineHeight: "1.8",
              marginBottom: "3rem",
            }}
          >
            These terms explain how the Positives affiliate program works, what
            qualifies for commission, how payouts are handled, and what kinds
            of promotion are not allowed. By joining the program, you agree to
            follow these rules.
          </p>

          <div
            className="space-y-10"
            style={{ fontSize: "1.025rem", color: "#4A5360", lineHeight: "1.8" }}
          >
            <Section title="Overview">
              <p>
                The Positives affiliate program is designed for genuine
                recommendation-based sharing. We want affiliates to introduce
                Positives to people who are likely to benefit from the daily
                practice, not to use aggressive or misleading tactics.
              </p>
            </Section>

            <Section title="Commission Structure">
              <p className="mb-4">
                Affiliates currently earn a recurring commission on qualifying
                paid memberships that are properly attributed through the
                official Positives affiliate tracking flow.
              </p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>The current standard commission rate is 20%.</li>
                <li>Commissions apply only to qualified paid memberships.</li>
                <li>FirstPromoter is the source of truth for affiliate attribution and reporting.</li>
                <li>We may change program economics in the future with reasonable notice.</li>
              </ul>
            </Section>

            <Section title="Qualified Referrals">
              <p className="mb-4">
                A referral qualifies for commission only when all of the
                following are true:
              </p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>The customer used a valid Positives affiliate tracking link.</li>
                <li>The signup was properly attributed in FirstPromoter.</li>
                <li>The payment was successfully completed.</li>
                <li>The membership was not refunded, charged back, fraudulent, or self-referred.</li>
              </ul>
            </Section>

            <Section title="Payouts">
              <p className="mb-4">
                Payouts are issued only for approved commissions. Positives may
                delay or withhold payout while we review unusual activity,
                pending refunds, or payout-readiness issues.
              </p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>You are responsible for keeping your payout information accurate and current.</li>
                <li>You may be required to complete payout setup before earnings are treated as payout-ready.</li>
                <li>If a payment processor or payout provider requires additional verification, that provider may have its own rules and timelines.</li>
              </ul>
            </Section>

            <Section title="Refunds, Reversals, and Chargebacks">
              <p>
                If a referred customer receives a refund, disputes a charge, or
                is determined to be fraudulent or invalid, the related
                commission may be reversed, canceled, or withheld from payout.
                Positives has the right to make these adjustments whenever
                needed to keep the program accurate and fair.
              </p>
            </Section>

            <Section title="Prohibited Behavior">
              <p className="mb-4">
                The following behaviors are not allowed and may result in
                withheld commissions or removal from the program:
              </p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>Self-referrals or purchasing through your own affiliate link.</li>
                <li>Creating fake leads, fake accounts, or fraudulent transactions.</li>
                <li>Misrepresenting Positives, Dr. Paul, pricing, guarantees, or results.</li>
                <li>Using spam, unsolicited bulk messages, or deceptive outreach.</li>
                <li>Bidding on protected brand terms in paid ads without written permission.</li>
                <li>Using coupon, rebate, or incentive tactics that were not explicitly approved.</li>
                <li>Publishing misleading claims, fake reviews, or unapproved medical or therapeutic promises.</li>
              </ul>
            </Section>

            <Section title="Content, Brand, and Disclosure">
              <p className="mb-4">
                You may describe Positives honestly and share approved links and
                resources, but you may not imply that you are an employee,
                owner, therapist, clinician, or official spokesperson unless
                Positives has given written permission.
              </p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>Use the Positives name, logo, and program description respectfully and accurately.</li>
                <li>Do not alter official brand assets in a misleading way.</li>
                <li>Follow applicable disclosure rules when promoting affiliate links, including clear affiliate disclosure where required.</li>
              </ul>
            </Section>

            <Section title="Program Changes and Removal">
              <p>
                Positives may change, pause, or end the affiliate program at any
                time. We may also suspend or remove an affiliate account if we
                believe the program is being used in a misleading, abusive,
                fraudulent, or policy-violating way. Removal from the program
                does not guarantee payout of disputed or invalid commissions.
              </p>
            </Section>

            <Section title="No Guarantee of Earnings">
              <p>
                Affiliate participation does not guarantee any level of clicks,
                leads, conversions, or earnings. Results vary based on audience,
                message quality, timing, trust, and many other factors.
              </p>
            </Section>

            <Section title="Questions and Support">
              <p>
                If you have questions about the affiliate program, payouts, or
                acceptable promotion standards, contact{" "}
                <a
                  href="mailto:support@positives.life"
                  className="underline underline-offset-2"
                  style={{ color: "#2F6FED" }}
                >
                  support@positives.life
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>

      <PublicSiteFooter paidHref={session.paidHref} watchHref={session.watchHref} session={session} />
    </div>
  );
}
