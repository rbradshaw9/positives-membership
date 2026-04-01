import { createClient } from "@/lib/supabase/server";
import { AccountClient } from "./account-client";
import { TimezoneForm } from "./timezone-form";
import { BillingButton } from "./billing-button";

export const metadata = {
  title: "Account — Positives",
  description: "Manage your Positives membership settings.",
};

/**
 * app/(member)/account/page.tsx
 * Account settings — Sprint 3 overhaul.
 *
 * Sections:
 *   1. Membership — plan name, status
 *   2. Billing — Stripe Customer Portal entry point
 *   3. Timezone — display + edit
 *   4. Security — email (read-only), password
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

  return (
    <div className="px-5 py-8 max-w-lg mx-auto flex flex-col gap-8">
      <header>
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          Account
        </h1>
      </header>

      {/* ── 1. Membership ────────────────────────────────────────── */}
      <section aria-labelledby="section-membership">
        <SectionLabel id="section-membership">Membership</SectionLabel>
        <div className="bg-card rounded-xl border border-border shadow-soft p-5 flex items-center justify-between">
          <div>
            <p className="font-heading font-semibold text-base text-foreground tracking-[-0.02em]">
              {planName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {member?.subscription_status ?? "active"}
            </p>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
            Active
          </span>
        </div>
      </section>

      {/* ── 2. Billing ───────────────────────────────────────────── */}
      <section aria-labelledby="section-billing">
        <SectionLabel id="section-billing">Billing</SectionLabel>
        {hasBillingPortal ? (
          <BillingButton />
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-soft p-5">
            <p className="text-sm text-muted-foreground">
              Billing management will be available once your account is fully set up.
            </p>
          </div>
        )}
      </section>

      {/* ── 3. Timezone ──────────────────────────────────────────── */}
      <section aria-labelledby="section-timezone">
        <SectionLabel id="section-timezone">Timezone</SectionLabel>
        <TimezoneForm currentTimezone={timezone} />
      </section>

      {/* ── 4. Security ──────────────────────────────────────────── */}
      <section aria-labelledby="section-security">
        <SectionLabel id="section-security">Security</SectionLabel>
        <div className="flex flex-col gap-3">
          {/* Email */}
          <div className="bg-muted/60 rounded-xl px-4 py-3 text-sm text-muted-foreground border border-border">
            {email}
          </div>

          {/* Password */}
          {passwordSet ? (
            <div className="bg-card rounded-xl border border-border shadow-soft px-4 py-3 flex items-center gap-3">
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
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-soft p-5">
              <p className="text-sm text-muted-foreground leading-body mb-5">
                You signed up via a magic link. Add a password so you can sign in
                anytime.
              </p>
              <AccountClient />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionLabel({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3"
    >
      {children}
    </h2>
  );
}
