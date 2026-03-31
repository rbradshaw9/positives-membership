import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

type MemberProfile = Pick<
  Tables<"member">,
  "id" | "email" | "name" | "subscription_status" | "subscription_tier"
>;


/**
 * lib/auth/require-active-member.ts
 * Server-side access guard for protected member routes.
 *
 * Redirect logic:
 * - Unauthenticated (no session)        → /login
 * - Authenticated, no member row        → /subscribe
 *   (brief race on first sign-in before trigger runs)
 * - Authenticated, subscription not active → /subscribe
 * - Authenticated, active subscription  → returns MemberProfile
 *
 * Use at the top of protected Server Component layouts/pages.
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
    // Member row missing — trigger may not have run yet (first sign-in race).
    // User IS authenticated, so redirect to /subscribe not /login.
    redirect("/subscribe");
  }

  const member = data;

  if (member.subscription_status !== "active") {
    // Authenticated but subscription is inactive, canceled, or past_due.
    redirect("/subscribe");
  }

  return member;
}
