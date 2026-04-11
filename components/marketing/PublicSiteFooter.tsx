import { Logo } from "@/components/marketing/Logo";
import { PublicTrackedLink } from "@/components/marketing/PublicTrackedLink";
import type { PublicSessionState } from "@/lib/marketing/public-session";

interface PublicSiteFooterProps {
  paidHref: string;
  watchHref: string;
  session: Pick<
    PublicSessionState,
    "hasMemberAccess" | "paidShortLabel" | "signInHref" | "signInLabel"
  >;
}

export function PublicSiteFooter({
  paidHref,
  watchHref,
  session,
}: PublicSiteFooterProps) {
  return (
    <footer className="w-full" style={{ background: "#FAFAF8", borderTop: "1px solid rgba(221,215,207,0.55)" }}>
      <div
        className="max-w-6xl mx-auto px-5 sm:px-8"
        style={{ paddingTop: "2.5rem", paddingBottom: "2.5rem" }}
      >
        <div className="mb-8 flex flex-col justify-between gap-10 md:flex-row md:items-start">
          <div>
            <Logo href="/" kind="wordmark" height={22} className="opacity-45" />
            <p
              className="mt-3"
              style={{ fontSize: "0.8rem", color: "#B0A89E", maxWidth: "220px", lineHeight: "1.65" }}
            >
              A daily mindset practice by Dr. Paul Jenkins, Clinical Psychologist.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase" style={{ color: "#9AA0A8", letterSpacing: "0.1em" }}>
                Practice
              </p>
              <div className="space-y-2">
                <PublicTrackedLink href={paidHref} className="block text-sm" style={{ color: "#68707A" }}>
                  {session.paidShortLabel}
                </PublicTrackedLink>
                <PublicTrackedLink href={watchHref} className="block text-sm" style={{ color: "#68707A" }}>
                  {session.hasMemberAccess ? "Today" : "Watch Dr. Paul"}
                </PublicTrackedLink>
                <PublicTrackedLink href="/#how-it-works" className="block text-sm" style={{ color: "#68707A" }}>
                  How it works
                </PublicTrackedLink>
                <PublicTrackedLink href={session.signInHref} className="block text-sm" style={{ color: "#68707A" }}>
                  {session.signInLabel}
                </PublicTrackedLink>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase" style={{ color: "#9AA0A8", letterSpacing: "0.1em" }}>
                Learn
              </p>
              <div className="space-y-2">
                <PublicTrackedLink href="/about" className="block text-sm" style={{ color: "#68707A" }}>
                  About Dr. Paul
                </PublicTrackedLink>
                <PublicTrackedLink href="/faq" className="block text-sm" style={{ color: "#68707A" }}>
                  FAQ
                </PublicTrackedLink>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase" style={{ color: "#9AA0A8", letterSpacing: "0.1em" }}>
                Help
              </p>
              <div className="space-y-2">
                <PublicTrackedLink href="/support" className="block text-sm" style={{ color: "#68707A" }}>
                  Support
                </PublicTrackedLink>
                <PublicTrackedLink href="/privacy" className="block text-sm" style={{ color: "#68707A" }}>
                  Privacy
                </PublicTrackedLink>
                <PublicTrackedLink href="/terms" className="block text-sm" style={{ color: "#68707A" }}>
                  Terms
                </PublicTrackedLink>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-between gap-3 sm:flex-row"
          style={{ borderTop: "1px solid rgba(221,215,207,0.55)", paddingTop: "1.25rem" }}
        >
          <span className="text-xs" style={{ color: "#C4BDB5" }}>
            © {new Date().getFullYear()} Positives. All rights reserved.
          </span>
          <p className="text-xs" style={{ color: "#C4BDB5" }}>
            From $37/month · Cancel anytime · 30-day guarantee
          </p>
        </div>
      </div>
    </footer>
  );
}
