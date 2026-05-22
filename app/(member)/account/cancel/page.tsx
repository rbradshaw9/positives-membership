import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/member/PageHeader";
import { SectionLabel } from "@/components/member/SectionLabel";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getPositivesPlanName } from "@/lib/plans";
import { getAccountBillingSummary } from "@/server/services/stripe/get-account-billing-summary";
import { CancelClient } from "./cancel-client";

export const metadata: Metadata = {
  title: "Cancel Membership — Positives",
  robots: { index: false, follow: false },
};

export default async function CancelPage() {
  const member = await requireActiveMember();
  const billing = await getAccountBillingSummary(member.stripe_customer_id);

  if (billing.currentSubscription?.cancelAtPeriodEnd) {
    redirect("/account");
  }

  const tier = member.subscription_tier ?? "level_1";
  const planName = getPositivesPlanName(tier);
  const amountLabel = billing.currentSubscription?.amountLabel ?? null;
  const intervalLabel = billing.currentSubscription?.intervalLabel ?? null;
  const isPlus = tier !== "level_1";

  return (
    <div>
      <PageHeader
        title="Cancel membership"
        subtitle="If you are thinking about leaving, we will walk through the options carefully."
        hero
        right={
          <Button href="/account/billing" variant="outline" size="sm" className="hidden md:inline-flex">
            Back to billing
          </Button>
        }
      />

      <div className="member-container py-8 md:py-10">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section aria-labelledby="cancel-current-plan">
            <SectionLabel id="cancel-current-plan">Current Plan</SectionLabel>
            <SurfaceCard elevated padding="lg" className="surface-card--editorial">
              <p className="member-detail-kicker">Membership</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {planName}
              </h2>
              {amountLabel ? (
                <p className="mt-2 text-sm leading-body text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {amountLabel}
                    {intervalLabel}
                  </span>
                  {" · "}
                  <span className="capitalize">
                    {billing.currentSubscription?.status.replace(/_/g, " ") ?? "active"}
                  </span>
                </p>
              ) : null}
              {billing.nextRenewalDate ? (
                <p className="mt-5 text-sm leading-body text-muted-foreground">
                  If you cancel, you still have access through{" "}
                  <span className="font-medium text-foreground">{billing.nextRenewalDate}</span>.
                </p>
              ) : null}
              {billing.currentSubscription?.discountLabel ? (
                <SurfaceCard padding="sm" className="mt-5 border border-secondary/12 bg-secondary/5">
                  <p className="text-sm font-medium text-foreground">Active discount</p>
                  <p className="mt-1 text-sm leading-body text-muted-foreground">
                    Stripe shows {billing.currentSubscription.discountLabel} on this subscription.
                  </p>
                </SurfaceCard>
              ) : null}
            </SurfaceCard>
          </section>

          <section aria-labelledby="cancel-options">
            <SectionLabel id="cancel-options">
              {isPlus ? "Available Options" : "Before You Go"}
            </SectionLabel>
            <SurfaceCard elevated padding="lg" className="surface-card--editorial">
              <CancelClient isPlus={isPlus} />
            </SurfaceCard>
          </section>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Button href="/account" variant="ghost" size="sm">
            Keep my membership
          </Button>
        </p>
      </div>
    </div>
  );
}
