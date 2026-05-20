/**
 * app/account/billing/page.tsx
 *
 * In-app billing hub. Replaces the old Stripe Customer Portal redirect.
 * Works two ways:
 *   - Logged-in member (session)
 *   - Past-due recovery email link (?token=...) — no login required
 *
 * Shows plan, renewal, payment method (with in-page update via Stripe
 * Payment Element), and invoice history. Cancel/upgrade live on their
 * own pages and are linked only in session mode.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/marketing/Logo";
import { resolveBillingContext } from "@/lib/billing/resolve-billing-context";
import { getAccountBillingSummary } from "@/server/services/stripe/get-account-billing-summary";
import { getDefaultPaymentMethod } from "@/server/services/stripe/get-payment-method";
import { BillingClient } from "./billing-client";

export const metadata: Metadata = {
  title: "Billing — Positives",
  robots: { index: false, follow: false },
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(iso));
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ctx = await resolveBillingContext(token);

  if (!ctx) {
    redirect("/login?next=/account/billing");
  }

  // Authenticated but no Stripe customer linked — show a message, never loop.
  if (!ctx.customerId) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: "#F6F3EE" }}>
        <div className="w-full max-w-sm text-center bg-card border border-border rounded-2xl p-8"
          style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}>
          <h1 className="font-heading font-bold text-xl text-foreground">Billing not set up</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            We couldn&apos;t find a billing account linked to {ctx.email}. If you believe this is
            an error, contact support@positives.life.
          </p>
          <Link href="/account" className="mt-5 inline-block text-sm text-primary hover:underline">
            ← Back to account
          </Link>
        </div>
      </div>
    );
  }

  const [summary, card] = await Promise.all([
    getAccountBillingSummary(ctx.customerId),
    getDefaultPaymentMethod(ctx.customerId),
  ]);

  const sub = summary.currentSubscription;
  const invoices = summary.recentInvoices ?? [];
  const sessionMode = ctx.mode === "session";

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
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo height={26} />
          {sessionMode && (
            <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to account
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-8 flex flex-col gap-5">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground" style={{ letterSpacing: "-0.02em" }}>
            Billing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{ctx.email}</span>
          </p>
        </div>

        {/* Past-due banner */}
        {sub?.status === "past_due" && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-900">Your last payment didn&apos;t go through</p>
            <p className="mt-1 text-sm text-amber-800">
              Update your card below to restore your membership. We&apos;ll retry the charge automatically.
            </p>
          </div>
        )}

        {/* Plan card */}
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "0 2px 12px rgba(18,20,23,0.04)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Current plan
          </p>
          {sub ? (
            <>
              <p className="text-lg font-semibold text-foreground">
                {sub.planName ?? "Positives membership"}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                {sub.amountLabel && (
                  <span>{sub.amountLabel}{sub.intervalLabel}</span>
                )}
                <span className="capitalize">· {sub.status.replace(/_/g, " ")}</span>
              </div>
              {sub.cancelAtPeriodEnd && sub.cancelAtLabel ? (
                <p className="mt-2 text-sm text-amber-700">
                  Ends on {sub.cancelAtLabel}
                </p>
              ) : summary.nextRenewalDate ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Renews on <span className="font-medium text-foreground">{summary.nextRenewalDate}</span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription on file.</p>
          )}
        </div>

        {/* Payment method — client component handles the update flow */}
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "0 2px 12px rgba(18,20,23,0.04)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Payment method
          </p>
          <BillingClient currentCard={card} token={token ?? null} />
        </div>

        {/* Invoices */}
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "0 2px 12px rgba(18,20,23,0.04)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Invoice history
          </p>
          {summary.invoiceLoadFailed ? (
            <p className="text-sm text-muted-foreground">Invoices couldn&apos;t be loaded right now.</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {invoices.map((inv) => {
                const amount = inv.amountPaidCents > 0 ? inv.amountPaidCents : inv.amountDueCents;
                return (
                  <div key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(inv.paidAt ?? inv.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {inv.status ?? "invoice"} · {formatMoney(amount, inv.currency)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {inv.invoicePdfUrl && (
                        <a href={inv.invoicePdfUrl} target="_blank" rel="noreferrer"
                          className="text-xs font-medium text-primary hover:underline">
                          PDF
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Plan management — session mode only (cancel/upgrade need a login) */}
        {sessionMode && (
          <div className="flex flex-wrap gap-3">
            <Link href="/account/cancel"
              className="text-sm text-muted-foreground hover:text-destructive transition-colors">
              Cancel membership
            </Link>
          </div>
        )}
      </div>

      <footer className="w-full py-6 text-center" style={{ borderTop: "1px solid rgba(221,215,207,0.5)" }}>
        <div className="flex items-center justify-center gap-4 text-xs" style={{ color: "#9AA0A8" }}>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
