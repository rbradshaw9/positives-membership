import { AccountClient } from "./account-client";
import { ProfileForm } from "./profile-form";
import { TimezoneForm } from "./timezone-form";
import { BillingButton } from "./billing-button";
import { PageHeader } from "@/components/member/PageHeader";
import { SectionLabel } from "@/components/member/SectionLabel";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { AffiliateCTA } from "@/components/affiliate/AffiliateCTA";
import { signOut } from "./actions";
import { getPositivesPlanName } from "@/lib/plans";
import { requireMember } from "@/lib/auth/require-member";
import { getAccountBillingSummary } from "@/server/services/stripe/get-account-billing-summary";

export const metadata = {
  title: "Account — Positives",
  description: "Manage your Positives membership settings and security.",
};

/**
 * app/(member)/account/page.tsx
 * Sprint 7: wider container, shared PageHeader + SectionLabel components.
 * Sprint 11: hero mode on PageHeader, elevated membership card with accent
 *   border, deeper shadows, unified status indicator.
 */

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [member, resolvedSearchParams] = await Promise.all([
    requireMember(),
    searchParams,
  ]);

  const email = member?.email ?? "";
  const passwordSet = member?.password_set === true;
  const tier = member?.subscription_tier ?? "level_1";
  const planName = getPositivesPlanName(tier);
  const timezone = member?.timezone ?? "America/New_York";
  const hasBillingPortal = !!member?.stripe_customer_id;
  const status = member?.subscription_status ?? "active";
  const memberName = member?.name?.trim() || "Member";
  const initials = memberName.charAt(0).toUpperCase();
  const { scheduledBillingChange, nextRenewalDate } = await getAccountBillingSummary(
    member?.stripe_customer_id
  );
  const billingUnavailable = resolvedSearchParams.error === "billing_unavailable";
  const joinedLabel = member?.created_at
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(member.created_at)
      )
    : "Recently";

  return (
    <div>
      <PageHeader
        title="Account"
        subtitle="Membership details, billing, timezone, security, and session controls."
        hero
        right={
          <Button href="/practice" variant="secondary" size="sm" className="hidden md:inline-flex">
            Open My Practice
          </Button>
        }
      />

      <div className="member-container py-8 md:py-10 flex flex-col gap-8">
        {billingUnavailable ? (
          <SurfaceCard
            className="border border-destructive/15 bg-destructive/5"
            padding="md"
          >
            <p className="text-sm font-medium text-foreground">
              Billing isn&apos;t available for this account yet.
            </p>
            <p className="mt-1 text-sm leading-body text-muted-foreground">
              We couldn&apos;t find a connected Stripe billing account for your membership. If this
              persists after a refresh, we should treat it as a setup issue and fix the billing
              link before asking members to manage their subscription here.
            </p>
          </SurfaceCard>
        ) : null}

        <SurfaceCard
          tone="dark"
          padding="lg"
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="ui-section-eyebrow mb-2 text-white/72">Member Profile</p>
              <h2
                className="heading-balance font-heading text-2xl font-bold tracking-[-0.03em] text-white"
              >
                {memberName}
              </h2>
              <p className="mt-1 text-sm text-white/74">{email}</p>
              <p className="mt-2 text-sm text-white/80">
                {planName} · {status} · Member since {joinedLabel}
              </p>
              {scheduledBillingChange ? (
                <p className="mt-2 text-sm text-white/74">
                  Changes to {scheduledBillingChange.nextPlanName} on{" "}
                  {scheduledBillingChange.effectiveLabel}.
                </p>
              ) : null}
              <p className="mt-3 max-w-xl text-sm leading-body text-white/74">
                Your deeper listening history and reflections now live in My Practice, while
                this page stays focused on account management.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 md:max-w-[18rem]">
            <Button href="/practice" variant="secondary" size="sm">
              Open My Practice
            </Button>
            <p className="text-sm text-white/72">
              Return to your dashboard, journal, and rhythm collections without crowding
              account settings.
            </p>
          </div>
        </SurfaceCard>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="section-profile">
              <SectionLabel id="section-profile">Profile</SectionLabel>
              <ProfileForm
                currentName={member?.name ?? ""}
                email={email}
                avatarUrl={member?.avatar_url}
              />
            </section>

            <section aria-labelledby="section-membership">
              <SectionLabel id="section-membership">Membership & Billing</SectionLabel>
              <SurfaceCard elevated className="surface-card--editorial">
                <p className="member-detail-kicker">Current plan</p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground">
                  {planName}
                </h2>
                <p className="mt-2 text-sm leading-body text-muted-foreground">
                  Subscription status: <span className="font-medium text-foreground">{status}</span>
                </p>
                <div className="mt-5 flex flex-col gap-4">
                  {scheduledBillingChange ? (
                    <SurfaceCard
                      padding="sm"
                      className="border border-secondary/12 bg-secondary/5"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {scheduledBillingChange.kind === "downgrade"
                          ? "Scheduled change saved"
                          : scheduledBillingChange.kind === "upgrade"
                            ? "Upcoming upgrade"
                            : "Upcoming billing change"}
                      </p>
                      <p className="mt-1 text-sm leading-body text-muted-foreground">
                        You keep {scheduledBillingChange.currentPlanName} through{" "}
                        {scheduledBillingChange.effectiveLabel}. On{" "}
                        {scheduledBillingChange.effectiveLabel}, your membership changes to{" "}
                        {scheduledBillingChange.nextPlanName} automatically.
                      </p>
                    </SurfaceCard>
                  ) : nextRenewalDate ? (
                    <p className="text-sm leading-body text-muted-foreground">
                      Renews on <span className="font-medium text-foreground">{nextRenewalDate}</span>.
                    </p>
                  ) : null}

                  {hasBillingPortal ? (
                    <BillingButton />
                  ) : (
                    <SurfaceCard elevated>
                      <p className="text-sm text-muted-foreground">
                        Billing management will be available once your account is fully set up.
                      </p>
                    </SurfaceCard>
                  )}

                  {!hasBillingPortal ? (
                    <p className="text-sm text-muted-foreground leading-body">
                      Membership changes will appear here once your billing setup is fully connected.
                    </p>
                  ) : null}
                </div>
              </SurfaceCard>
            </section>

            <section aria-labelledby="section-timezone">
              <SectionLabel id="section-timezone">Timezone</SectionLabel>
              <TimezoneForm currentTimezone={timezone} />
            </section>

            <section aria-labelledby="section-referral">
              <SectionLabel id="section-referral">Affiliate Program</SectionLabel>
              {member?.fp_promoter_id ? (
                <SurfaceCard elevated className="surface-card--editorial">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="member-detail-kicker">Active affiliate</p>
                      <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
                        You&apos;re earning 20% recurring
                      </h2>
                      <p className="mt-1.5 text-sm leading-body text-muted-foreground">
                        View your link, stats, share kit, and commission history.
                      </p>
                    </div>
                    <span className="text-3xl flex-shrink-0" aria-hidden="true">🔗</span>
                  </div>
                  <div className="mt-5">
                    <Button href="/account/affiliate" variant="primary" size="sm">
                      Open Affiliate Portal
                    </Button>
                  </div>
                </SurfaceCard>
              ) : (
                <AffiliateCTA />
              )}
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section aria-labelledby="section-security">
              <SectionLabel id="section-security">Security</SectionLabel>
              <div className="flex flex-col gap-3">
                <SurfaceCard padding="sm" className="text-sm text-muted-foreground">
                  {email}
                </SurfaceCard>

                {passwordSet ? (
                  <SurfaceCard elevated padding="lg" className="surface-card--editorial">
                    <div className="flex items-center gap-3">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4E8C78"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-sm font-medium text-secondary">
                        Password is set
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-body text-muted-foreground">
                      Your email and password can be used anytime for a direct sign-in flow.
                      You can also replace that password here while you&apos;re signed in.
                    </p>
                    <div className="mt-5 border-t border-border/70 pt-5">
                      <AccountClient mode="change" />
                    </div>
                    <p className="mt-4 text-xs leading-body text-muted-foreground">
                      If you ever get locked out, use the forgot-password link on the sign-in page
                      and we&apos;ll email you a secure recovery link.
                    </p>
                  </SurfaceCard>
                ) : (
                  <SurfaceCard elevated padding="lg" className="surface-card--editorial">
                    <p className="text-sm text-muted-foreground leading-body mb-5">
                      You signed up via a magic link. Add a password so you can sign in anytime.
                    </p>
                    <AccountClient mode="create" />
                  </SurfaceCard>
                )}
              </div>
            </section>

            <section aria-labelledby="section-session">
              <SectionLabel id="section-session">Session</SectionLabel>
              <SurfaceCard elevated className="surface-card--editorial">
                <p className="member-detail-kicker">Current session</p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground">
                  Signed in as {memberName}
                </h2>
                <p className="mt-2 text-sm leading-body text-muted-foreground">
                  Sign out here if you&apos;re using a shared device or wrapping up your session.
                </p>
                <form action={signOut} className="mt-5">
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-start text-sm text-destructive hover:text-destructive"
                  >
                    Sign out
                  </Button>
                </form>
              </SurfaceCard>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
