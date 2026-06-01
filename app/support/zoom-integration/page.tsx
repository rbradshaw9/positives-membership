import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/marketing/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/marketing/PublicSiteHeader";
import { ANONYMOUS_PUBLIC_SESSION_STATE } from "@/lib/marketing/public-session";

export const metadata: Metadata = {
  title: "Zoom Integration Guide - Positives",
  description: "How to connect, use, troubleshoot, and remove the Positives Zoom integration.",
  alternates: {
    canonical: "/support/zoom-integration",
  },
};

const headingStyle = {
  fontSize: "1.25rem",
  color: "#121417",
  letterSpacing: "-0.02em",
  textWrap: "balance" as const,
};

const linkStyle = {
  color: "#2F6FED",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export default function ZoomIntegrationGuidePage() {
  const session = ANONYMOUS_PUBLIC_SESSION_STATE;

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: "#FAFAF8" }}>
      <PublicSiteHeader
        signInHref={session.signInHref}
        signInLabel={session.signInLabel}
        navLinks={[
          { href: "/", label: "Home" },
          { href: "/faq", label: "FAQ", hiddenOnMobile: true },
          { href: "/support", label: "Support" },
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
            Integration guide
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
            Using Zoom with Positives
          </h1>
          <p className="mb-12" style={{ fontSize: "1.05rem", color: "#68707A", lineHeight: "1.75" }}>
            Positives uses Zoom to create and manage online events, webinars, and coaching sessions. This guide explains how an authorized admin or coach connects Zoom, how Zoom is used in Positives, and how to remove the integration.
          </p>

          <div className="space-y-10" style={{ fontSize: "1rem", color: "#4A5360", lineHeight: "1.8" }}>
            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Who can connect Zoom
              </h2>
              <p className="mb-4">
                Platform admins can connect shared Zoom accounts for member events, webinars, and fallback coaching sessions. Coaches with coaching management access can connect their own Zoom account for sessions they host.
              </p>
              <ul className="list-disc space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>Platform Zoom accounts are managed from the Positives admin integration area.</li>
                <li>Coach-owned Zoom accounts are available only to the linked coach and authorized admins.</li>
                <li>Zoom join links are shown only inside eligible member or admin workflows.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Add the Zoom integration
              </h2>
              <ol className="list-decimal space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>Sign in to Positives with an admin or coach account that has permission to manage Zoom.</li>
                <li>Open <a href="/admin/integrations/zoom" style={linkStyle}>Admin, Integrations, Zoom</a>.</li>
                <li>Choose either <strong>Connect Platform Zoom</strong> or <strong>Connect My Coaching Zoom</strong>.</li>
                <li>Review the Zoom authorization screen and approve the requested access.</li>
                <li>After Zoom redirects back to Positives, run the read verification and smoke test from the Zoom accounts table.</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                How Positives uses Zoom
              </h2>
              <ul className="list-disc space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>Events can create or attach a Zoom meeting or webinar before publishing.</li>
                <li>Recurring events use one shared recurring Zoom session when created as a series.</li>
                <li>Coaching bookings create a scheduled Zoom meeting at booking time when a Zoom account is available.</li>
                <li>Coaching reschedules update the attached Zoom meeting time and duration.</li>
                <li>Coaching cancellations attempt to delete the attached Zoom meeting and remove the active join path in Positives.</li>
                <li>Member, coach, confirmation, reminder, and calendar details point to the Zoom join URL when one is attached.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Zoom permissions requested
              </h2>
              <ul className="list-disc space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li><strong>User read:</strong> confirms which Zoom account is connected.</li>
                <li><strong>Meeting list, create, update, and delete:</strong> supports meetings for events and coaching sessions.</li>
                <li><strong>Webinar list, create, update, and delete:</strong> supports Zoom webinars for member events.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Remove the Zoom integration
              </h2>
              <ol className="list-decimal space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>Sign in to your Zoom account and open the Zoom App Marketplace.</li>
                <li>Go to <strong>Manage</strong>, then <strong>Added Apps</strong>.</li>
                <li>Find the Positives app and choose <strong>Remove</strong>.</li>
                <li>In Positives, an admin can return to <a href="/admin/integrations/zoom" style={linkStyle}>Admin, Integrations, Zoom</a> to confirm the account is marked disconnected or needs reconnection.</li>
              </ol>
              <p className="mt-4">
                Removing the app prevents Positives from creating, updating, or deleting Zoom sessions from that connected account. Existing Positives event and coaching records remain in Positives, but future Zoom actions require reconnection.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-heading font-semibold" style={headingStyle}>
                Troubleshooting and support
              </h2>
              <ul className="list-disc space-y-2 pl-5" style={{ color: "#68707A" }}>
                <li>If a Zoom account shows missing scopes, reconnect it after the Zoom app scopes are updated.</li>
                <li>If event publishing fails, confirm the event has a connected Zoom session attached.</li>
                <li>If a coaching session is missing a Zoom link, an admin should verify the coach default Zoom account and run the Zoom smoke test.</li>
              </ul>
              <p className="mt-4">
                For help, contact <a href="mailto:support@positives.life" style={linkStyle}>support@positives.life</a>. We typically respond within one business day, Monday through Friday.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicSiteFooter paidHref={session.paidHref} session={session} />
    </div>
  );
}
