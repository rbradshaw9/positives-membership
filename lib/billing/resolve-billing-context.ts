import { verifyBillingToken } from "@/lib/auth/billing-token";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

/**
 * lib/billing/resolve-billing-context.ts
 *
 * Resolves the Stripe customer for a billing request via EITHER:
 *  - a signed billing token (past-due recovery email — no login required), or
 *  - the authenticated Supabase session.
 *
 * Used by the /account/billing page and the billing API routes so both
 * the logged-in flow and the tokenless email flow share one code path.
 */

export type BillingContext = {
  /** null = authenticated, but no Stripe customer linked yet */
  customerId: string | null;
  email: string;
  mode: "token" | "session";
  memberId?: string;
  memberName?: string | null;
  memberAvatarUrl?: string | null;
  subscriptionTier?: string | null;
  launchCohort?: string | null;
};

/**
 * Returns null ONLY when the request is unauthenticated (no token, no session).
 * An authenticated member with no Stripe customer returns a context with
 * customerId: null — so callers can show "billing not set up" instead of
 * bouncing to /login (which would loop via the ?next= param).
 */
export async function resolveBillingContext(
  token: string | null | undefined
): Promise<BillingContext | null> {
  // ── Token path — no login required ──────────────────────────────────────
  if (token) {
    const result = verifyBillingToken(token);
    if (result.ok) {
      return {
        customerId: result.payload.stripeCustomerId,
        email: result.payload.email,
        mode: "token",
      };
    }
  }

  // ── Session path ────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = asLooseSupabaseClient(getAdminClient());
  const { data: member } = await admin
    .from("member")
    .select<{
      id: string;
      stripe_customer_id: string | null;
      email: string;
      name: string | null;
      avatar_url: string | null;
      subscription_tier: string | null;
      launch_cohort: string | null;
    }>(
      "id, stripe_customer_id, email, name, avatar_url, subscription_tier, launch_cohort"
    )
    .eq("id", user.id)
    .maybeSingle();

  // Authenticated, but billing may not be linked — return customerId: null
  // rather than null so the page shows a message instead of looping to login.
  return {
    customerId: member?.stripe_customer_id ?? null,
    email: member?.email ?? user.email ?? "",
    mode: "session",
    memberId: member?.id ?? user.id,
    memberName: member?.name ?? null,
    memberAvatarUrl: member?.avatar_url ?? null,
    subscriptionTier: member?.subscription_tier ?? null,
    launchCohort: member?.launch_cohort ?? null,
  };
}
