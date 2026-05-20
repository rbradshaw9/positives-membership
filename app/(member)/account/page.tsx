import { AccountClient } from "./account-client";
import { ProfileForm } from "./profile-form";
import { TimezoneForm } from "./timezone-form";
import { BillingButton } from "./billing-button";
import { PageHeader } from "@/components/member/PageHeader";
import { SectionLabel } from "@/components/member/SectionLabel";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { AffiliateCTA } from "@/components/affiliate/AffiliateCTA";
import { UpgradeCard } from "./upgrade-card";
import { PodcastFeedSection } from "./podcast-feed-section";
import { signOut } from "./actions";
import { getPositivesPlanName } from "@/lib/plans";
import { requireMember } from "@/lib/auth/require-member";
import { createClient } from "@/lib/supabase/server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { getAccountBillingSummary } from "@/server/services/stripe/get-account-billing-summary";
import type { MemberStripeInvoiceActivity } from "@/server/services/stripe/member-billing-activity";

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

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "Not connected";
  return status.replaceAll("_", " ");
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function getInvoiceAmount(invoice: MemberStripeInvoiceActivity) {
  return invoice.amountPaidCents > 0 ? invoice.amountPaidCents : invoice.amountDueCents;
}

function getMembershipStateCopy(params: {
  status: string | null | undefined;
  hasCourseOnlyAccess: boolean;
  hasBillingPortal: boolean;
}) {
  if (params.status === "past_due") {
    return {
      eyebrow: "Payment attention needed",
      title: "Update billing to continue your membership",
      body: "Your account is still here. Update your payment method in the billing center and Stripe will sync access back automatically.",
      tone: "warning",
    };
  }

  if (params.hasCourseOnlyAccess) {
    return {
      eyebrow: "Course access",
      title: "Your purchased courses remain available",
      body: "Your daily membership access is not active right now, but your owned courses stay available in your library.",
      tone: "course",
    };
  }

  if (!params.hasBillingPortal) {
    return {
      eyebrow: "Billing not connected yet",
      title: "Billing management is not available for this account yet",
      body: "Your profile is available, but we could not find a connected Stripe billing record. Contact support if this looks wrong.",
      tone: "inactive",
    };
  }

  if (params.status === "trialing") {
    return {
      eyebrow: "Trial membership",
      title: "Your trial is active",
      body: "You can use the full daily practice experience while your trial is active. Billing details live in the billing center.",
      tone: "active",
    };
  }

  if (params.status === "active") {
    return {
      eyebrow: "Active membership",
      title: "Your membership is active",
      body: "Everything is set for today's practice. Billing details and changes are handled securely through Stripe.",
      tone: "active",
    };
  }

  if (params.status === "canceled") {
    return {
      eyebrow: "Membership ended",
      title: "Your membership is not active right now",
      body: "You can restart when it feels right. If you own courses, they remain available in your library.",
      tone: "inactive",
    };
  }

  return {
    eyebrow: "Membership",
    title: "Your account is ready",
    body: "Profile, security, and billing details are collected here so account management stays separate from your daily practice.",
    tone: "active",
  };
}

async function getActiveCourseEntitlementCount(memberId: string) {
  const supabase = asLooseSupabaseClient(await createClient());
  const { count, error } = await supabase
    .from("course_entitlement")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("status", "active");

  if (error) {
    console.error("[Account] Failed to load course entitlement count:", error.message);
    return 0;
  }

  return count ?? 0;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [member, resolvedSearchParams] = await Promise.all([requireMember(), searchParams]);

  const email = member.email;
  const passwordSet = member.password_set === true;
  const tier = member.subscription_tier ?? "level_1";
  const planName = getPositivesPlanName(tier);
  const timezone = member.timezone ?? "America/New_York";
  const status = member.subscription_status;
  const memberName = member.name?.trim() || "Member";
  const initials = memberName.charAt(0).toUpperCase();
  const supabaseForToken = asLooseSupabaseClient(await createClient());
  const { data: podcastData } = await supabaseForToken
    .from("member")
    .select<{ podcast_token: string }>("podcast_token")
    .eq("id", member.id)
    .single();
  const podcastToken = podcastData?.podcast_token ?? null;

  const [billingSummary, activeCourseEntitlementCount] = await Promise.all([
    getAccountBillingSummary(member.stripe_customer_id),
    getActiveCourseEntitlementCount(member.id),
  ]);
  const scheduledBillingChange = billingSummary.scheduledBillingChange ?? null;
  const nextRenewalDate = billingSummary.nextRenewalDate ?? null;
  const billingPortalAvailable = billingSummary.billingPortalAvailable === true;
  const currentSubscription = billingSummary.currentSubscription ?? null;
  const recentInvoices = billingSummary.recentInvoices ?? [];
  const invoiceLoadFailed = billingSummary.invoiceLoadFailed === true;
  const hasBillingPortal = billingPortalAvailable;
  const billingUnavailable = resolvedSearchParams.error === "billing_unavailable";
  const retentionAccepted = resolvedSearchParams.retention === "accepted";
  const justUpgraded = resolvedSearchParams.upgraded === "true";
  const joinedLabel = member.created_at
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(member.created_at)
      )
    : "Recently";
  const hasSubscriptionAccess = hasActiveMemberAccess(status);
  const showUpgradeCard = tier === "level_1" && hasSubscriptionAccess;
  const hasCourseOnlyAccess = !hasSubscriptionAccess && activeCourseEntitlementCount > 0;
  const membershipState = getMembershipStateCopy({
    status,
    hasCourseOnlyAccess,
    hasBillingPortal,
  });
  const renewalLabel =
    currentSubscription?.cancelAtPeriodEnd && currentSubscription.cancelAtLabel
      ? `Ends on ${currentSubscription.cancelAtLabel}`
      : nextRenewalDate
        ? `Renews on ${nextRenewalDate}`
        : status === "past_due"
          ? "Payment update needed"
          : "Billing date unavailable";

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
                {planName} · {formatStatusLabel(status)} · Member since {joinedLabel}
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

        <SurfaceCard
          padding="lg"
          className={[
            "border",
            membershipState.tone === "warning"
              ? "border-destructive/25 bg-destructive/5"
              : membershipState.tone === "course"
                ? "border-primary/20 bg-primary/5"
                : "border-border",
          ].join(" ")}
        >
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="ui-section-eyebrow mb-2">{membershipState.eyebrow}</p>
              <h2 className="heading-balance font-heading text-2xl font-bold tracking-tight text-foreground">
                {membershipState.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-body text-muted-foreground">
                {membershipState.body}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              {status === "past_due" && hasBillingPortal ? (
                <BillingButton label="Update billing" description="Fix payment method or open invoices" />
              ) : hasCourseOnlyAccess ? (
                <Button href="/join" variant="primary" size="sm">
                  Explore membership
                </Button>
              ) : hasSubscriptionAccess ? (
                <Button href="/today" variant="secondary" size="sm">
                  Go to Today
                </Button>
              ) : (
                <Button href="/join" variant="primary" size="sm">
                  Restart membership
                </Button>
              )}
            </div>
          </div>
        </SurfaceCard>

        {retentionAccepted && (
          <SurfaceCard padding="md" className="border border-secondary/20 bg-secondary/5">
            <p className="text-sm font-semibold text-foreground">Discount applied — thank you for staying.</p>
            <p className="mt-1 text-sm text-muted-foreground">Your discount is active and will appear on your next invoice.</p>
          </SurfaceCard>
        )}

        {justUpgraded && (
          <SurfaceCard padding="md" className="border border-secondary/20 bg-secondary/5">
            <p className="text-sm font-semibold text-foreground">Welcome to Positives Plus!</p>
            <p className="mt-1 text-sm text-muted-foreground">Your upgrade is live. The prorated charge will appear on your next invoice.</p>
          </SurfaceCard>
        )}

        {showUpgradeCard && <UpgradeCard />}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="section-profile">
              <SectionLabel id="section-profile">Profile</SectionLabel>
              <ProfileForm
                currentName={member.name ?? ""}
                email={email}
                avatarUrl={member.avatar_url}
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
                  Subscription status:{" "}
                  <span className="font-medium capitalize text-foreground">
                    {formatStatusLabel(status)}
                  </span>
                </p>
                <dl className="mt-5 grid gap-3 rounded-2xl border border-border/70 bg-surface-tint/30 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Access</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {hasSubscriptionAccess
                        ? "Full membership"
                        : hasCourseOnlyAccess
                          ? "Owned courses"
                          : "Inactive"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Billing</dt>
                    <dd className="mt-1 font-medium text-foreground">{renewalLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Password</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {passwordSet ? "Password set" : "Set a password anytime"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Timezone</dt>
                    <dd className="mt-1 font-medium text-foreground">{timezone}</dd>
                  </div>
                </dl>
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
                  ) : currentSubscription?.cancelAtPeriodEnd && currentSubscription.cancelAtLabel ? (
                    <p className="text-sm leading-body text-muted-foreground">
                      Your membership is scheduled to end on{" "}
                      <span className="font-medium text-foreground">
                        {currentSubscription.cancelAtLabel}
                      </span>.
                    </p>
                  ) : null}

                  {currentSubscription ? (
                    <p className="text-sm leading-body text-muted-foreground">
                      Stripe subscription:{" "}
                      <span className="font-medium text-foreground">
                        {currentSubscription.planName ?? planName}
                      </span>
                      {currentSubscription.amountLabel ? (
                        <>
                          {" "}
                          at{" "}
                          <span className="font-medium text-foreground">
                            {currentSubscription.amountLabel}
                            {currentSubscription.intervalLabel}
                          </span>
                        </>
                      ) : null}
                      .
                    </p>
                  ) : null}

                  {hasBillingPortal ? (
                    <BillingButton />
                  ) : (
                    <div className="rounded-2xl border border-border bg-surface-tint/40 p-4">
                      <p className="text-sm font-medium text-foreground">
                        Billing not connected yet
                      </p>
                      <p className="mt-1 text-sm leading-body text-muted-foreground">
                        We do not have a Stripe billing record linked to this account yet. Your
                        support team can reconnect billing if this looks wrong.
                      </p>
                    </div>
                  )}

                  {!hasBillingPortal ? (
                    <p className="text-sm text-muted-foreground leading-body">
                      Membership changes will appear here once your billing setup is fully connected.
                    </p>
                  ) : null}
                </div>
              </SurfaceCard>
            </section>

            <section aria-labelledby="section-invoices">
              <SectionLabel id="section-invoices">Recent Invoices</SectionLabel>
              <SurfaceCard elevated className="surface-card--editorial">
                <p className="member-detail-kicker">Billing history</p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground">
                  Recent invoices
                </h2>
                <p className="mt-2 text-sm leading-body text-muted-foreground">
                  View recent Stripe invoices here. Payment methods, cancellation, and plan changes
                  stay in the billing center.
                </p>

                {invoiceLoadFailed ? (
                  <p className="mt-5 rounded-2xl border border-border bg-surface-tint/40 p-4 text-sm leading-body text-muted-foreground">
                    Recent invoices could not be loaded right now. You can still open the billing
                    center for the full billing record.
                  </p>
                ) : recentInvoices.length > 0 ? (
                  <div className="mt-5 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border">
                    {recentInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="grid gap-3 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {invoice.number ?? invoice.id}
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {formatDate(invoice.paidAt ?? invoice.createdAt)} ·{" "}
                            <span className="capitalize">{invoice.status ?? "invoice"}</span> ·{" "}
                            {formatMoney(getInvoiceAmount(invoice), invoice.currency)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {invoice.hostedInvoiceUrl ? (
                            <a
                              href={invoice.hostedInvoiceUrl}
                              className="btn-outline px-3 py-1.5 text-xs"
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </a>
                          ) : null}
                          {invoice.invoicePdfUrl ? (
                            <a
                              href={invoice.invoicePdfUrl}
                              className="btn-ghost px-3 py-1.5 text-xs"
                              target="_blank"
                              rel="noreferrer"
                            >
                              PDF
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl border border-border bg-surface-tint/40 p-4 text-sm leading-body text-muted-foreground">
                    No Stripe invoices are available for this account yet.
                  </p>
                )}
              </SurfaceCard>
            </section>

            <section aria-labelledby="section-timezone">
              <SectionLabel id="section-timezone">Timezone</SectionLabel>
              <TimezoneForm currentTimezone={timezone} />
            </section>

            <section aria-labelledby="section-coaching">
              <SectionLabel id="section-coaching">Coaching Sessions</SectionLabel>
              <SurfaceCard elevated className="surface-card--editorial">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="member-detail-kicker">1:1 personal coaching</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
                      Work directly with Dr. Paul
                    </h2>
                    <p className="mt-1.5 text-sm leading-body text-muted-foreground">
                      Purchase sessions, check your balance, and view session history.
                    </p>
                  </div>
                  <span className="text-3xl flex-shrink-0" aria-hidden="true">🧭</span>
                </div>
                <div className="mt-5">
                  <Button href="/account/coaching" variant="secondary" size="sm">
                    Coaching Sessions
                  </Button>
                </div>
              </SurfaceCard>
            </section>

            {podcastToken && hasSubscriptionAccess && (
              <section aria-labelledby="section-podcast">
                <SectionLabel id="section-podcast">Daily Practice Podcast</SectionLabel>
                <PodcastFeedSection
                  feedUrl={`${process.env.NEXT_PUBLIC_APP_URL}/api/podcast/${podcastToken}`}
                />
              </section>
            )}

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
            <section id="password" aria-labelledby="section-security" className="scroll-mt-24">
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
