import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";

export const metadata: Metadata = {
  title: "Terms of Service — Positives",
  description: "The terms and conditions for using the Positives membership platform.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#FAFAF8" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        navLinks={[
          { href: "/", label: "Home" },
          { href: "/faq", label: "FAQ", hiddenOnMobile: true },
          { href: "/support", label: "Support", hiddenOnMobile: true },
        ]}
        primaryCtaHref={session.paidHref}
        primaryCtaLabel={session.paidShortLabel}
      />

      {/* Content */}
      <main className="flex-1 w-full">
        <div
          className="max-w-3xl mx-auto px-5 sm:px-8"
          style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(4rem, 8vw, 7rem)" }}
        >
          <p className="text-xs font-semibold uppercase mb-6" style={{ color: "#9AA0A8", letterSpacing: "0.14em" }}>
            Legal
          </p>
          <h1
            className="font-heading font-bold mb-3"
            style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", letterSpacing: "-0.045em", lineHeight: "1.06", color: "#121417" }}
          >
            Terms of Service
          </h1>
          <p className="mb-12 text-sm" style={{ color: "#9AA0A8" }}>Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <div className="space-y-10" style={{ fontSize: "1.025rem", color: "#4A5360", lineHeight: "1.8" }}>
            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Agreement to Terms
              </h2>
              <p>
                By accessing or using the Positives platform (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. These terms apply to all members and visitors.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                The Service
              </h2>
              <p>
                Positives is a membership-based daily practice platform created by Dr. Paul Jenkins. It provides members with access to daily guided audio sessions, weekly reflections, monthly themes, and additional live events or coaching features at higher membership levels. Content is made available for personal, non-commercial use only.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Membership and Billing
              </h2>
              <p className="mb-4">
                Positives memberships are billed on a recurring monthly or annual basis depending on the plan selected at signup. By subscribing, you authorize us to charge your payment method on file automatically at the start of each billing period.
              </p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>You may manage cancellation at any time through your account dashboard</li>
                <li>Cancellation takes effect at the end of the current billing period — you retain access until then</li>
                <li>We reserve the right to change pricing with 30 days advance notice to existing members</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                30-Day Money-Back Guarantee
              </h2>
              <p>
                If you are not satisfied with your membership within the first 30 days, contact us at{" "}
                <a href="mailto:support@positives.life" className="underline underline-offset-2" style={{ color: "#2F6FED" }}>support@positives.life</a>{" "}
                and we will issue a full refund, no questions asked. This guarantee applies to your first subscription period only and is not available to accounts that have previously received a refund.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Intellectual Property
              </h2>
              <p>
                All content within the Positives platform — including audio sessions, monthly themes, live event replays, written materials, and the Positives brand — is the exclusive intellectual property of Dr. Paul Jenkins and Positives. You may not reproduce, distribute, or create derivative works from any platform content without prior written permission.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Acceptable Use
              </h2>
              <p className="mb-4">You agree not to:</p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>Share your account credentials with others</li>
                <li>Reproduce or redistribute platform content</li>
                <li>Use the platform for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any part of the platform</li>
                <li>Harass, abuse, or harm other community members</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Disclaimer
              </h2>
              <p>
                Positives is an educational and personal development platform. It is not a substitute for professional mental health treatment, medical advice, or therapy. Dr. Paul Jenkins&apos; content is intended for educational purposes. Always consult a qualified professional for clinical concerns.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Limitation of Liability
              </h2>
              <p>
                To the fullest extent permitted by law, Positives and its creators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability to you shall not exceed the amount you paid in the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Changes to Terms
              </h2>
              <p>
                We may update these Terms of Service at any time. We will provide reasonable notice of material changes by email or through the platform. Continued use of Positives after changes take effect constitutes acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Contact
              </h2>
              <p>
                Questions about these Terms? Please contact us at{" "}
                <a href="mailto:support@positives.life" className="underline underline-offset-2" style={{ color: "#2F6FED" }}>
                  support@positives.life
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicSiteFooter paidHref={session.paidHref} watchHref={session.watchHref} session={session} />
    </div>
  );
}
