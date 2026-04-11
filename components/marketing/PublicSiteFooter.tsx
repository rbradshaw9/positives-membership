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
    <footer
      className="w-full"
      style={{ background: "#FAFAF8", borderTop: "1px solid rgba(221,215,207,0.55)" }}
    >
      <div
        className="max-w-6xl mx-auto px-5 sm:px-8"
        style={{ paddingTop: "2.75rem", paddingBottom: "2.75rem" }}
      >
        <div className="mb-8 flex flex-col justify-between gap-10 md:flex-row md:items-start">
          <div>
            <Logo href="/" kind="wordmark" height={22} className="opacity-55" />
            <p
              className="mt-3 text-sm"
              style={{ color: "#8E877F", maxWidth: "240px", lineHeight: "1.75" }}
            >
              A daily mindset practice by Dr. Paul Jenkins, Clinical Psychologist.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:flex sm:flex-wrap sm:gap-x-12 sm:gap-y-6">
            <div>
              <p
                className="mb-3 text-[11px] font-semibold uppercase"
                style={{ color: "#8E959E", letterSpacing: "0.12em" }}
              >
                Practice
              </p>
              <div className="space-y-2">
                <PublicTrackedLink
                  href={paidHref}
                  className="block py-0.5 text-[0.95rem]"
                  style={{ color: "#4F5760", lineHeight: "1.65" }}
                >
                  {session.paidShortLabel}
                </PublicTrackedLink>
                <PublicTrackedLink
                  href={watchHref}
                  className="block py-0.5 text-[0.95rem]"
                  style={{ color: "#4F5760", lineHeight: "1.65" }}
                >
                  {session.hasMemberAccess ? "Today" : "Watch Dr. Paul"}
                </PublicTrackedLink>
                <PublicTrackedLink
                  href="/#how-it-works"
                  className="block py-0.5 text-[0.95rem]"
                  style={{ color: "#4F5760", lineHeight: "1.65" }}
                >
                  How it works
                </PublicTrackedLink>
                <PublicTrackedLink
                  href={session.signInHref}
                  className="block py-0.5 text-[0.95rem]"
                  style={{ color: "#4F5760", lineHeight: "1.65" }}
                >
                  {session.signInLabel}
                </PublicTrackedLink>
              </div>
            </div>

            <div>
              <p
                className="mb-3 text-[11px] font-semibold uppercase"
                style={{ color: "#8E959E", letterSpacing: "0.12em" }}
              >
                Learn
              </p>
              <div className="space-y-2">
                <PublicTrackedLink
                  href="/about"
                  className="block py-0.5 text-[0.95rem]"
                  style={{ color: "#4F5760", lineHeight: "1.65" }}
                >
                  About Dr. Paul
                </PublicTrackedLink>
                <PublicTrackedLink
                  href="/faq"
                  className="block py-0.5 text-[0.95rem]"
                  style={{ color: "#4F5760", lineHeight: "1.65" }}
                >
                  FAQ
                </PublicTrackedLink>
              </div>
            </div>

            <div>
              <p
                className="mb-3 text-[11px] font-semibold uppercase"
                style={{ color: "#8E959E", letterSpacing: "0.12em" }}
              >
                Help
              </p>
              <div className="space-y-2">
                <PublicTrackedLink
                  href="/support"
                  className="block py-0.5 text-[0.95rem]"
                  style={{ color: "#4F5760", lineHeight: "1.65" }}
                >
                  Support
                </PublicTrackedLink>
                <PublicTrackedLink
                  href="/privacy"
                  className="block py-0.5 text-[0.95rem]"
                  style={{ color: "#4F5760", lineHeight: "1.65" }}
                >
                  Privacy
                </PublicTrackedLink>
                <PublicTrackedLink
                  href="/terms"
                  className="block py-0.5 text-[0.95rem]"
                  style={{ color: "#4F5760", lineHeight: "1.65" }}
                >
                  Terms
                </PublicTrackedLink>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-between gap-3 sm:flex-row"
          style={{ borderTop: "1px solid rgba(221,215,207,0.55)", paddingTop: "1.4rem" }}
        >
          <span className="text-[0.78rem] sm:text-xs" style={{ color: "#AAA298" }}>
            © {new Date().getFullYear()} Positives. All rights reserved.
          </span>
          <p className="text-[0.78rem] text-center sm:text-xs" style={{ color: "#AAA298" }}>
            From $37/month · Cancel anytime · 30-day guarantee
          </p>
        </div>
      </div>
    </footer>
  );
}
