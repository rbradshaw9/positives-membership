import { createClient } from "@/lib/supabase/server";
import { AccountClient } from "./account-client";
import { TimezoneForm } from "./timezone-form";
import { BillingButton } from "./billing-button";
import { PageHeader } from "@/components/member/PageHeader";
import { SectionLabel } from "@/components/member/SectionLabel";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ReferralCard } from "@/components/account/ReferralCard";
import { signOut } from "./actions";

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

const PLAN_NAMES: Record<string, string> = {
  level_1: "Positives Membership",
  level_2: "Positives Plus",
  level_3: "Positives Circle",
  level_4: "Executive Coaching",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("member")
    .select(
      "email, name, password_set, subscription_tier, subscription_status, stripe_customer_id, timezone, rewardful_affiliate_token, rewardful_affiliate_id"
    )
    .eq("id", user!.id)
    .single();

  const email = member?.email ?? user?.email ?? "";
  const passwordSet = member?.password_set === true;
  const tier = member?.subscription_tier ?? "level_1";
  const planName = PLAN_NAMES[tier] ?? "Positives Membership";
  const timezone = member?.timezone ?? "America/New_York";
  const hasBillingPortal = !!member?.stripe_customer_id;
  const status = member?.subscription_status ?? "active";
  const memberName = member?.name?.trim() || "Member";
  const initials = memberName.charAt(0).toUpperCase();
  const joinedLabel = user?.created_at
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(user.created_at)
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
              <p className="ui-section-eyebrow mb-2 text-white/60">Member Profile</p>
              <h2
                className="heading-balance font-heading text-2xl font-bold tracking-[-0.03em] text-white"
              >
                {memberName}
              </h2>
              <p className="mt-1 text-sm text-white/60">{email}</p>
              <p className="mt-2 text-sm text-white/72">
                {planName} · {status} · Member since {joinedLabel}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-body text-white/62">
                Your deeper listening history and reflections now live in My Practice, while
                this page stays focused on account management.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 md:max-w-[18rem]">
            <Button href="/practice" variant="secondary" size="sm">
              Open My Practice
            </Button>
            <p className="text-sm text-white/56">
              Return to your dashboard, journal, and rhythm collections without crowding
              account settings.
            </p>
          </div>
        </SurfaceCard>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="flex flex-col gap-6">
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
                <p className="mt-1 text-sm leading-body text-muted-foreground">
                  Billing, invoices, and payment methods stay connected to this account.
                </p>
                <div className="mt-5">
                  {hasBillingPortal ? (
                    <BillingButton />
                  ) : (
                    <SurfaceCard elevated>
                      <p className="text-sm text-muted-foreground">
                        Billing management will be available once your account is fully set up.
                      </p>
                    </SurfaceCard>
                  )}
                </div>
              </SurfaceCard>
            </section>

            <section aria-labelledby="section-timezone">
              <SectionLabel id="section-timezone">Timezone</SectionLabel>
              <TimezoneForm currentTimezone={timezone} />
            </section>

            <section aria-labelledby="section-referral">
              <SectionLabel id="section-referral">Affiliate Program</SectionLabel>
              {member?.rewardful_affiliate_id ? (
                <SurfaceCard elevated className="surface-card--editorial">
                  <p className="member-detail-kicker">You&apos;re an affiliate</p>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground">
                    Earn 20% recurring
                  </h2>
                  <p className="mt-2 text-sm leading-body text-muted-foreground">
                    View your referral link, track clicks and conversions, and download share
                    resources — all in your affiliate portal.
                  </p>
                  <div className="mt-5">
                    <Button href="/account/affiliate" variant="secondary" size="sm">
                      Open Affiliate Portal →
                    </Button>
                  </div>
                </SurfaceCard>
              ) : (
                <ReferralCard
                  initialToken={member?.rewardful_affiliate_token ?? null}
                  initialAffiliateId={member?.rewardful_affiliate_id ?? null}
                />
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
                    </p>
                  </SurfaceCard>
                ) : (
                  <SurfaceCard elevated padding="lg" className="surface-card--editorial">
                    <p className="text-sm text-muted-foreground leading-body mb-5">
                      You signed up via a magic link. Add a password so you can sign in anytime.
                    </p>
                    <AccountClient />
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
