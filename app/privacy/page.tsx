import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { getPublicSessionState } from "@/lib/marketing/public-session";

export const metadata: Metadata = {
  title: "Privacy Policy — Positives",
  description: "How Positives collects, uses, and protects your personal information.",
  alternates: {
    canonical: "/privacy",
  },
};

export default async function PrivacyPage() {
  const session = await getPublicSessionState();

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
            Privacy Policy
          </h1>
          <p className="mb-12 text-sm" style={{ color: "#9AA0A8" }}>Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <div className="space-y-10" style={{ fontSize: "1.025rem", color: "#4A5360", lineHeight: "1.8" }}>
            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Overview
              </h2>
              <p>
                Positives (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our website and membership services.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Information We Collect
              </h2>
              <p className="mb-4">We collect information you provide directly to us, including:</p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>Name and email address when you create an account</li>
                <li>Payment information (processed securely through Stripe — we never store card details)</li>
                <li>Usage data and activity within the Positives platform</li>
                <li>Communications you send us</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                How We Use Your Information
              </h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>Provide, maintain, and improve the Positives membership experience</li>
                <li>Process transactions and send related information, including receipts</li>
                <li>Send you practice reminders and membership communications (you may opt out at any time)</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze usage patterns to improve our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Data Sharing
              </h2>
              <p>
                We do not sell, trade, or rent your personal information to third parties. We may share information with trusted service providers who assist us in operating our platform (such as Stripe for payment processing and Supabase for data storage), subject to confidentiality agreements. We may also disclose information if required by law.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Data Security
              </h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information. All data is encrypted in transit using TLS. Payment data is handled exclusively by Stripe, which is PCI DSS compliant. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Your Rights
              </h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of marketing communications at any time</li>
              </ul>
              <p className="mt-4">To exercise any of these rights, please contact us at <a href="mailto:support@positives.life" className="underline underline-offset-2" style={{ color: "#2F6FED" }}>support@positives.life</a>.</p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Cookies
              </h2>
              <p className="mb-4">
                We use a mix of essential cookies and limited analytics or attribution cookies.
              </p>
              <ul className="space-y-2 pl-5 list-disc" style={{ color: "#68707A" }}>
                <li>Essential cookies keep you signed in, maintain your session, and support secure access to member features.</li>
                <li>Analytics cookies help us understand high-level site usage and important product events so we can improve the Positives experience.</li>
                <li>Attribution cookies help us understand when a visitor arrived through an approved referral or affiliate link.</li>
              </ul>
              <p className="mt-4">
                We currently use service providers including Google Analytics for product and website measurement and FirstPromoter for affiliate attribution. We do not use third-party advertising cookies to build ad audiences or sell your personal information. You can control cookies through your browser settings, but disabling some cookies may affect login, checkout, referral attribution, or other core site functions.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice on our platform. Your continued use of Positives after changes become effective constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="font-heading font-semibold mb-4" style={{ fontSize: "1.25rem", color: "#121417", letterSpacing: "-0.02em" }}>
                Contact
              </h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at{" "}
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
