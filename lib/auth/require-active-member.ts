import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus, SubscriptionTier } from "@/types/supabase";

type MemberProfile = {
  id: string;
  email: string;
  name: string | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier;
};

/**
 * lib/auth/require-active-member.ts
 * Server-side access guard for protected member routes.
 *
 * Redirects to /login if:
 * - no authenticated session exists
 * - member record not found
 * - subscription_status is not 'active'
 *
 * Use at the top of protected Server Component page files.
 * Returns the member profile when access is granted.
 */
export async function requireActiveMember(): Promise<MemberProfile> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data, error: memberError } = await supabase
    .from("member")
    .select("id, email, name, subscription_status, subscription_tier")
    .eq("id", user.id)
    .single();

  if (memberError || !data) {
    // Member record may not exist yet (race on signup) — send to login
    redirect("/login");
  }

  const member = data as MemberProfile;

  if (member.subscription_status !== "active") {
    // Expired or cancelled — redirect with context
    redirect("/login?reason=subscription_inactive");
  }

  return member;
}
