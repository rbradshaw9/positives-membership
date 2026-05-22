/**
 * app/account/billing/page.tsx
 *
 * In-app billing hub. Works two ways:
 *   - Logged-in member (session): uses the member navigation and card system.
 *   - Past-due recovery email link (?token=...): no login required.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberTopNav } from "@/components/member/MemberTopNav";
import { PageHeader } from "@/components/member/PageHeader";
import { SectionLabel } from "@/components/member/SectionLabel";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { resolveBillingContext, type BillingContext } from "@/lib/billing/resolve-billing-context";
import { getPositivesPlanName } from "@/lib/plans";
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
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function BillingFrame({
  ctx,
  children,
}: {
  ctx: BillingContext;
  children: React.ReactNode;
}) {
  if (ctx.mode === "session") {
    return (
      <div className="member-shell min-h-dvh">
        <MemberTopNav
          tier={ctx.subscriptionTier}
          memberName={ctx.memberName}
          memberAvatarUrl={ctx.memberAvatarUrl}
        />
        <main className="member-shell__content flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <main>{children}</main>
    </div>
  );
}

function BillingUnavailable({ ctx }: { ctx: BillingContext }) {
  return (
    <BillingFrame ctx={ctx}>
      <PageHeader
        title="Billing"
        subtitle="We could not find a billing account linked to this member profile."
        hero
      />
      <div className="member-container py-8 md:py-10">
        <SurfaceCard elevated padding="lg" className="surface-card--editorial max-w-xl">
          <p className="ui-section-eyebrow mb-2">Billing not set up</p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Billing is not connected yet
          </h2>
          <p className="mt-2 text-sm leading-body text-muted-foreground">
            We could not find a billing account linked to {ctx.email}. If you believe this is
            an error, contact support@positives.life.
          </p>
          <div className="mt-5">
            <Button href="/account" variant="outline" size="sm">
              Back to account
            </Button>
          </div>
        </SurfaceCard>
      </div>
    </BillingFrame>
  );
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

  if (!ctx.customerId) {
    return <BillingUnavailable ctx={ctx} />;
  }

  const [summary, card] = await Promise.all([
    getAccountBillingSummary(ctx.customerId),
    getDefaultPaymentMethod(ctx.customerId),
  ]);

  const sub = summary.currentSubscription;
  const invoices = summary.recentInvoices ?? [];
  const sessionMode = ctx.mode === "session";
  const scheduledBillingChange = summary.scheduledBillingChange;
  const currentTier = ctx.subscriptionTier ?? "level_1";
  const isPlusOrHigher = currentTier !== "level_1";
  const currentPlanName = getPositivesPlanName(currentTier);

  return (
    <BillingFrame ctx={ctx}>
      <PageHeader
        title="Billing"
        subtitle={`Plan details, invoices, and membership changes for ${ctx.email}.`}
        hero
        right={
          sessionMode ? (
            <Button href="/account" variant="outline" size="sm" className="hidden md:inline-flex">
              Back to account
            </Button>
          ) : null
        }
      />

      <div className="member-container py-8 md:py-10 flex flex-col gap-8">
        {sub?.status === "past_due" && (
          <SurfaceCard padding="md" className="border border-destructive/25 bg-destructive/5">
            <p className="text-sm font-semibold text-foreground">Payment attention needed</p>
            <p className="mt-1 text-sm leading-body text-muted-foreground">
              Update your card below to restore your membership. We will retry the charge automatically.
            </p>
          </SurfaceCard>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section aria-labelledby="billing-plan">
            <SectionLabel id="billing-plan">Current Plan</SectionLabel>
            <SurfaceCard elevated padding="lg" className="surface-card--editorial">
              {sub ? (
                <>
                  <p className="member-detail-kicker">Membership</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                    {sub.planName ?? "Positives membership"}
                  </h2>
                  <p className="mt-2 text-sm leading-body text-muted-foreground">
                    {sub.amountLabel ? (
                      <>
                        <span className="font-medium text-foreground">{sub.amountLabel}{sub.intervalLabel}</span>
                        {" · "}
                      </>
                    ) : null}
                    <span className="capitalize">{sub.status.replace(/_/g, " ")}</span>
                  </p>

                  {sub.cancelAtPeriodEnd && sub.cancelAtLabel ? (
                    <SurfaceCard padding="sm" className="mt-5 border border-destructive/15 bg-destructive/5">
                      <p className="text-sm font-medium text-foreground">Cancellation scheduled</p>
                      <p className="mt-1 text-sm leading-body text-muted-foreground">
                        Your membership remains available until {sub.cancelAtLabel}.
                      </p>
                    </SurfaceCard>
                  ) : scheduledBillingChange ? (
                    <SurfaceCard padding="sm" className="mt-5 border border-secondary/12 bg-secondary/5">
                      <p className="text-sm font-medium text-foreground">
                        {scheduledBillingChange.kind === "downgrade"
                          ? "Downgrade scheduled"
                          : "Plan change scheduled"}
                      </p>
                      <p className="mt-1 text-sm leading-body text-muted-foreground">
                        You keep {scheduledBillingChange.currentPlanName} through{" "}
                        {scheduledBillingChange.effectiveLabel}. Then your membership changes to{" "}
                        {scheduledBillingChange.nextPlanName}.
                      </p>
                    </SurfaceCard>
                  ) : summary.nextRenewalDate ? (
                    <p className="mt-5 text-sm leading-body text-muted-foreground">
                      Renews on <span className="font-medium text-foreground">{summary.nextRenewalDate}</span>.
                    </p>
                  ) : null}

                  {sub.discountLabel ? (
                    <SurfaceCard padding="sm" className="mt-4 border border-secondary/12 bg-secondary/5">
                      <p className="text-sm font-medium text-foreground">Active discount</p>
                      <p className="mt-1 text-sm leading-body text-muted-foreground">
                        Stripe shows {sub.discountLabel} on this subscription.
                      </p>
                    </SurfaceCard>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No active subscription on file.</p>
              )}
            </SurfaceCard>
          </section>

          <section aria-labelledby="billing-payment">
            <SectionLabel id="billing-payment">Payment Method</SectionLabel>
            <SurfaceCard elevated padding="lg" className="surface-card--editorial">
              <BillingClient currentCard={card} token={token ?? null} />
            </SurfaceCard>
          </section>
        </div>

        <section aria-labelledby="billing-invoices">
          <SectionLabel id="billing-invoices">Invoice History</SectionLabel>
          <SurfaceCard elevated padding="lg" className="surface-card--editorial">
            {summary.invoiceLoadFailed ? (
              <p className="text-sm text-muted-foreground">Invoices could not be loaded right now.</p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border">
                {invoices.map((inv) => {
                  const amount = inv.amountPaidCents > 0 ? inv.amountPaidCents : inv.amountDueCents;
                  return (
                    <div
                      key={inv.id}
                      className="grid gap-3 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {inv.number ?? formatDate(inv.paidAt ?? inv.createdAt)}
                        </p>
                        <p className="mt-1 text-muted-foreground capitalize">
                          {formatDate(inv.paidAt ?? inv.createdAt)} · {inv.status ?? "invoice"} ·{" "}
                          {formatMoney(amount, inv.currency)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl}
                            className="btn-outline px-3 py-1.5 text-xs"
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        ) : null}
                        {inv.invoicePdfUrl ? (
                          <a
                            href={inv.invoicePdfUrl}
                            className="btn-ghost px-3 py-1.5 text-xs"
                            target="_blank"
                            rel="noreferrer"
                          >
                            PDF
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>
        </section>

        {sessionMode && (
          <section aria-labelledby="billing-manage">
            <SectionLabel id="billing-manage">Plan Details</SectionLabel>
            <SurfaceCard elevated padding="lg" className="surface-card--editorial">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Manage your billing without leaving Positives
                  </h2>
                  <div className="mt-2 space-y-2 text-sm leading-body text-muted-foreground">
                    <p>
                      Use this page for payment information, billing updates, and invoice history.
                    </p>
                    <p>
                      Your current plan is{" "}
                      <span className="font-medium text-foreground">{currentPlanName}</span>
                      {sub?.amountLabel ? (
                        <>
                          {" "}
                          at{" "}
                          <span className="font-medium text-foreground">
                            {sub.amountLabel}
                            {sub.intervalLabel}
                          </span>
                        </>
                      ) : null}
                      .
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 sm:flex-row md:flex-col md:items-end">
                  {isPlusOrHigher ? (
                    <p className="max-w-xs text-left text-xs leading-body text-muted-foreground md:text-right">
                      Need help changing plans? Email support@positives.life and we will help you
                      choose the right fit.
                    </p>
                  ) : (
                    <Button href="/account/upgrade-confirm" variant="outline" size="sm">
                      Review Plus
                    </Button>
                  )}
                  <Button href="/account" variant="ghost" size="sm">
                    Back to account
                  </Button>
                </div>
              </div>
              <div className="mt-6 border-t border-border pt-4">
                <p className="text-xs leading-body text-muted-foreground">
                  Need to stop renewal?{" "}
                  <Link href="/account/cancel" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Cancel membership
                  </Link>
                </p>
              </div>
            </SurfaceCard>
          </section>
        )}

        {!sessionMode && (
          <p className="text-center text-xs leading-body text-muted-foreground">
            This secure billing link only allows payment repair. Sign in to manage plan changes
            from your account.
          </p>
        )}
      </div>

      {!sessionMode && (
        <footer className="w-full py-6 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </footer>
      )}
    </BillingFrame>
  );
}
