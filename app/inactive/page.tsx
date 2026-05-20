import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth/require-member";
import { Logo } from "@/components/marketing/Logo";

export const metadata: Metadata = {
  title: "Membership Inactive — Positives",
  robots: { index: false, follow: false },
};

type StatusConfig = {
  heading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

function getStatusConfig(status: string | null): StatusConfig {
  switch (status) {
    case "canceled":
      return {
        heading: "Your membership was canceled",
        body: "You no longer have access to Positives. Rejoin any time to pick up where you left off.",
        primaryLabel: "Rejoin Positives",
        primaryHref: "/join",
        secondaryLabel: "View billing history",
        secondaryHref: "/account/billing",
      };
    case "past_due":
      return {
        heading: "There's an issue with your payment",
        body: "Your last payment didn't go through. Update your payment method to restore access.",
        primaryLabel: "Fix payment method",
        primaryHref: "/account/billing",
      };
    case "inactive":
    default:
      return {
        heading: "Your membership is inactive",
        body: "Your account exists but your membership isn't active. Start a membership to access Positives.",
        primaryLabel: "Start membership",
        primaryHref: "/join",
        secondaryLabel: "Manage billing",
        secondaryHref: "/account/billing",
      };
  }
}

export default async function InactivePage() {
  const member = await requireMember();
  const cfg = getStatusConfig(member.subscription_status ?? null);

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F6F3EE" }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(246,243,238,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.6)",
        }}
      >
        <div className="max-w-6xl mx-auto px-8 py-4">
          <Logo height={26} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-sm">
          <div
            className="bg-card border border-border rounded-2xl p-8"
            style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
          >
            <div className="text-center mb-6">
              <span
                className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
                style={{ background: "#FEF3C7" }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <h1
                className="font-heading font-bold text-xl text-foreground"
                style={{ letterSpacing: "-0.02em" }}
              >
                {cfg.heading}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {cfg.body}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Signed in as{" "}
                <span className="font-medium text-foreground">{member.email}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={cfg.primaryHref}
                className="w-full text-center px-6 py-3.5 rounded-full text-white font-medium text-sm transition-all"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  boxShadow: "0 6px 24px rgba(47,111,237,0.25)",
                  letterSpacing: "-0.01em",
                }}
              >
                {cfg.primaryLabel}
              </Link>
              {cfg.secondaryLabel && cfg.secondaryHref && (
                <Link
                  href={cfg.secondaryHref}
                  className="w-full text-center px-6 py-3 rounded-full text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors"
                >
                  {cfg.secondaryLabel}
                </Link>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Wrong account?{" "}
            <Link href="/auth/sign-out" className="text-primary hover:underline">
              Sign out
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="w-full py-6 text-center"
        style={{ borderTop: "1px solid rgba(221,215,207,0.5)" }}
      >
        <div
          className="flex items-center justify-center gap-4 text-xs"
          style={{ color: "#9AA0A8" }}
        >
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <span aria-hidden="true">·</span>
          <span>© {new Date().getFullYear()} Positives</span>
        </div>
      </footer>
    </div>
  );
}
