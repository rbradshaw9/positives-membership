import { createClient } from "@/lib/supabase/server";
import { getMemberPracticeSummary } from "@/lib/queries/get-member-practice-summary";
import { AccountClient } from "./account-client";
import { TimezoneForm } from "./timezone-form";
import { BillingButton } from "./billing-button";
import { PageHeader } from "@/components/member/PageHeader";
import { SectionLabel } from "@/components/member/SectionLabel";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { signOut } from "./actions";

export const metadata = {
  title: "My Practice — Positives",
  description: "Manage your Positives membership settings.",
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

function Heatmap({ values }: { values: Array<{ date: string; active: boolean }> }) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-2 sm:grid-cols-14">
        {values.map((cell) => (
          <div
            key={cell.date}
            className="aspect-square rounded-[4px]"
            style={{
              background: cell.active
                ? "var(--color-primary)"
                : "color-mix(in srgb, var(--color-muted) 85%, white)",
              opacity: cell.active ? 1 : 0.95,
            }}
            title={cell.date}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-muted inline-block" />
          No practice
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary inline-block" />
          Practiced
        </span>
      </div>
    </div>
  );
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("member")
    .select(
      "email, name, password_set, subscription_tier, subscription_status, stripe_customer_id, timezone"
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
  const summary = user ? await getMemberPracticeSummary(user.id) : null;
  const memberName = member?.name?.trim() || "Member";
  const initials = memberName.charAt(0).toUpperCase();
  const hasPracticeHistory =
    (summary?.listenCount ?? 0) > 0 || (summary?.journalCount ?? 0) > 0 || (summary?.practiceStreak ?? 0) > 0;
  const joinedLabel = user?.created_at
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(user.created_at)
      )
    : "Recently";

  return (
    <div>
      <PageHeader
        title="My Practice"
        subtitle="Your rhythm, membership settings, and progress all in one place."
        hero
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
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
            <StatCard label="Streak" value={summary?.practiceStreak ?? 0} />
            <StatCard label="Listens" value={summary?.listenCount ?? 0} />
            <StatCard label="Notes" value={summary?.journalCount ?? 0} />
          </div>
          {!hasPracticeHistory && (
            <p className="text-sm text-white/62 md:max-w-[20rem]">
              Your dashboard will fill in as you complete practices and capture reflections.
            </p>
          )}
        </SurfaceCard>

        <section aria-labelledby="section-history">
          <SectionLabel id="section-history">Practice History</SectionLabel>
          <SurfaceCard elevated className="overflow-hidden">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
                  Last 10 weeks
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your activity map is based on completed listens recorded in Positives.
                </p>
              </div>
            </div>
            {hasPracticeHistory ? (
              <Heatmap values={summary?.heatmap ?? []} />
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background px-5 py-8 text-center">
                <p className="font-medium text-foreground">No completed listens yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your heatmap will light up from completed listening activity as you return to your practice.
                </p>
              </div>
            )}
          </SurfaceCard>
        </section>

        <section aria-labelledby="section-billing">
          <SectionLabel id="section-billing">Membership & Billing</SectionLabel>
          {hasBillingPortal ? (
            <BillingButton />
          ) : (
            <SurfaceCard elevated>
              <p className="text-sm text-muted-foreground">
                Billing management will be available once your account is fully set up.
              </p>
            </SurfaceCard>
          )}
        </section>

        <section aria-labelledby="section-timezone">
          <SectionLabel id="section-timezone">Timezone</SectionLabel>
          <TimezoneForm currentTimezone={timezone} />
        </section>

        <section aria-labelledby="section-security">
          <SectionLabel id="section-security">Security</SectionLabel>
          <div className="flex flex-col gap-3">
            <SurfaceCard padding="sm" className="text-sm text-muted-foreground">
              {email}
            </SurfaceCard>

            {passwordSet ? (
              <SurfaceCard
                elevated
                padding="sm"
                className="flex items-center gap-3"
              >
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
              </SurfaceCard>
            ) : (
              <SurfaceCard elevated padding="lg">
                <p className="text-sm text-muted-foreground leading-body mb-5">
                  You signed up via a magic link. Add a password so you can sign in
                  anytime.
                </p>
                <AccountClient />
              </SurfaceCard>
            )}
          </div>
        </section>

        <section aria-labelledby="section-signout">
          <SectionLabel id="section-signout">Session</SectionLabel>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-start text-sm text-destructive hover:text-destructive"
            >
              Sign out
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
