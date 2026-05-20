import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getAccountBillingSummary } from "@/server/services/stripe/get-account-billing-summary";
import { getPositivesPlanName } from "@/lib/plans";
import { Logo } from "@/components/marketing/Logo";
import { CancelClient } from "./cancel-client";

export const metadata: Metadata = {
  title: "Cancel Membership — Positives",
  robots: { index: false, follow: false },
};

export default async function CancelPage() {
  const member = await requireActiveMember();

  // Don't show this page if subscription is already set to cancel
  const billing = await getAccountBillingSummary(member.stripe_customer_id);
  if (billing.currentSubscription?.cancelAtPeriodEnd) {
    redirect("/account");
  }

  const tier = member.subscription_tier ?? "level_1";
  const planName = getPositivesPlanName(tier);
  const amountLabel = billing.currentSubscription?.amountLabel ?? null;
  const intervalLabel = billing.currentSubscription?.intervalLabel ?? null;
  const isL1 = tier === "level_1";

  const offerTitle = isL1 ? "1 Month Free" : "50% Off Next Month";
  const offerSavings = amountLabel
    ? isL1
      ? `Save ${amountLabel}`
      : `Save ${amountLabel ? "~half your next bill" : "50%"}`
    : isL1 ? "Skip your next payment entirely" : "Save 50% on your next bill";
  const offerBody = isL1
    ? `By clicking redeem you keep full access and your next month is completely free. After that, you'll continue at your regular rate. You can still cancel any time.`
    : `By clicking redeem you keep full access and your next invoice is 50% off. After that, you'll continue at your regular rate. You can still cancel any time.`;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#F6F3EE" }}>
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(246,243,238,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(221,215,207,0.6)",
        }}
      >
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <Logo height={26} />
          <Link
            href="/account"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to account
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-sm">
          <div
            className="bg-card border border-border rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
          >
            {/* Plan header */}
            <div className="px-8 pt-8 pb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Confirm cancellation
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{planName}</p>
              {amountLabel && (
                <p className="mt-1 text-2xl font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
                  {amountLabel}
                  {intervalLabel && <span className="text-base font-normal text-muted-foreground">{intervalLabel}</span>}
                </p>
              )}
              {billing.nextRenewalDate && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  If you cancel, you&apos;ll still have access until the end of your billing period on{" "}
                  <span className="font-medium text-foreground">{billing.nextRenewalDate}</span>.
                </p>
              )}
            </div>

            {/* Retention offer */}
            <div className="mx-4 mb-4 rounded-xl p-5 text-white" style={{ background: "#111827" }}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-2">
                Before you go&hellip;
              </p>
              <p className="text-lg font-bold leading-tight" style={{ letterSpacing: "-0.02em" }}>
                {offerTitle}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70" aria-hidden="true">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <span className="text-sm opacity-80">{offerSavings}</span>
              </div>
              <p className="mt-3 text-sm opacity-70 leading-relaxed">{offerBody}</p>
            </div>

            <div className="px-4 pb-6 flex flex-col gap-3">
              <CancelClient />
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/account" className="text-primary hover:underline">
              Keep my membership
            </Link>
          </p>
        </div>
      </div>

      <footer
        className="w-full py-6 text-center"
        style={{ borderTop: "1px solid rgba(221,215,207,0.5)" }}
      >
        <div className="flex items-center justify-center gap-4 text-xs" style={{ color: "#9AA0A8" }}>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <span aria-hidden="true">·</span>
          <span>© {new Date().getFullYear()} Positives</span>
        </div>
      </footer>
    </div>
  );
}
