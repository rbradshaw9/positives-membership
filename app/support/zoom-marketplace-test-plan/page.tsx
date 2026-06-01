import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";

export const metadata: Metadata = {
  title: "Zoom Marketplace Test Plan - Positives",
  description: "Reviewer test plan for the Positives Zoom integration.",
  alternates: {
    canonical: "/support/zoom-marketplace-test-plan",
  },
};

const headingStyle = {
  fontSize: "1.25rem",
  color: "#121417",
  letterSpacing: "-0.02em",
  textWrap: "balance" as const,
};

const codeStyle = {
  borderRadius: "0.4rem",
  background: "rgba(18,20,23,0.06)",
  padding: "0.1rem 0.35rem",
  color: "#121417",
  fontSize: "0.92em",
};

export default function ZoomMarketplaceTestPlanPage() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: "#FAFAF8" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        navLinks={[
          { href: "/", label: "Home" },
          { href: "/support/zoom-integration", label: "Zoom guide" },
          { href: "/support", label: "Support", hiddenOnMobile: true },
        ]}
        primaryCtaHref={session.paidHref}
        primaryCtaLabel={session.paidShortLabel}
      />

      <main className="w-full flex-1">
        <div
          className="mx-auto max-w-3xl px-5 sm:px-8"
          style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(4rem, 8vw, 7rem)" }}
        >
          <p className="mb-6 text-xs font-semibold uppercase" style={{ color: "#4E8C78", letterSpacing: "0.14em" }}>
            Reviewer test plan
          </p>
          <h1
            className="mb-5 font-heading font-bold"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.045em",
              lineHeight: "1.06",
              color: "#121417",
              textWrap: "balance",
            }}
          >
            Positives Zoom test plan
          </h1>
          <p className="mb-12" style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.75" }}>
            This page is intended for Zoom Marketplace review. Test account credentials should be supplied through the secure Zoom submission fields, not on this public page.
          </p>

          <div className="space-y-10" style={{ fontSize: "1rem", color: "#4A5360", lineHeight: "1.8" }}>
            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Reviewer prerequisites
              </h2>
              <ul className="list-disc space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>Use the Positives test login supplied in the Zoom submission.</li>
                <li>Use a Zoom account that can authorize the Positives OAuth app and create meetings and webinars.</li>
                <li>Open Positives production at <a href="https://positives.life" className="underline underline-offset-2" style={{ color: "#2F6FED" }}>https://positives.life</a>.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Authorization flow
              </h2>
              <ol className="list-decimal space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>Sign in to Positives with the supplied admin test account.</li>
                <li>Open <span style={codeStyle}>/admin/integrations/zoom</span>.</li>
                <li>Select <strong>Connect Platform Zoom</strong>.</li>
                <li>On the Zoom authorization screen, review and approve the requested scopes.</li>
                <li>Confirm Zoom redirects back to <span style={codeStyle}>/admin/integrations/zoom</span> and the new connection appears in the table.</li>
                <li>Run <strong>Verify read</strong> to test Zoom user, meeting list, and webinar list access.</li>
                <li>Run <strong>Smoke test</strong> to test user lookup plus meeting and webinar create, update, and delete.</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Scope-by-scope verification
              </h2>
              <ul className="list-disc space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li><span style={codeStyle}>user:read:user</span> is verified by resolving the connected Zoom user.</li>
                <li><span style={codeStyle}>meeting:read:list_meetings</span> is verified by listing scheduled meetings for the connected user.</li>
                <li><span style={codeStyle}>meeting:write:meeting</span> is verified by creating a throwaway scheduled meeting.</li>
                <li><span style={codeStyle}>meeting:update:meeting</span> is verified by updating that throwaway meeting.</li>
                <li><span style={codeStyle}>meeting:delete:meeting</span> is verified by deleting that throwaway meeting.</li>
                <li><span style={codeStyle}>webinar:read:list_webinars</span> is verified by listing webinars for the connected user.</li>
                <li><span style={codeStyle}>webinar:write:webinar</span> is verified by creating a throwaway webinar.</li>
                <li><span style={codeStyle}>webinar:update:webinar</span> is verified by updating that throwaway webinar.</li>
                <li><span style={codeStyle}>webinar:delete:webinar</span> is verified by deleting that throwaway webinar.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Event meeting flow
              </h2>
              <ol className="list-decimal space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>Open <span style={codeStyle}>/admin/events/new</span>.</li>
                <li>Create a draft event with <strong>Join method</strong> set to Zoom.</li>
                <li>Select <strong>Create new Zoom session</strong> and choose <strong>Meeting</strong>.</li>
                <li>Save or publish the event.</li>
                <li>Confirm the event edit screen shows the Zoom session ID and join URL status.</li>
                <li>Open the member event page and confirm eligible members see the Zoom join path.</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Event webinar flow
              </h2>
              <ol className="list-decimal space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>Open <span style={codeStyle}>/admin/events/new</span>.</li>
                <li>Create a draft webinar-style event with <strong>Join method</strong> set to Zoom.</li>
                <li>Select <strong>Create new Zoom session</strong> and choose <strong>Webinar</strong>.</li>
                <li>Save or publish the event.</li>
                <li>Confirm the event edit screen shows the Zoom webinar ID and join URL status.</li>
                <li>Open the member event page and confirm eligible members see the Zoom join path.</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Coaching session flow
              </h2>
              <ol className="list-decimal space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>Ensure the test member has at least one coaching session credit.</li>
                <li>Open the member coaching booking flow and book an available time.</li>
                <li>Confirm the booking detail page shows a Zoom join panel.</li>
                <li>Reschedule the booking and confirm the Zoom meeting remains attached.</li>
                <li>Cancel the booking and confirm the active join path is no longer presented.</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Removing the integration
              </h2>
              <ol className="list-decimal space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>In Zoom App Marketplace, go to <strong>Manage</strong>, then <strong>Added Apps</strong>.</li>
                <li>Select Positives and remove the app.</li>
                <li>Return to Positives and confirm the Zoom account is no longer usable until it is reconnected.</li>
              </ol>
            </section>
          </div>
        </div>
      </main>

      <PublicSiteFooter paidHref={session.paidHref} session={session} />
    </div>
  );
}
