import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

export type MemberProfile = Pick<
  Tables<"member">,
  | "id"
  | "email"
  | "name"
  | "subscription_status"
  | "subscription_tier"
  | "password_set"
  | "email_unsubscribed"
  | "practice_streak"
  | "last_practiced_at"
  | "created_at"
  | "stripe_customer_id"
  | "timezone"
  | "fp_ref_id"
  | "fp_promoter_id"
>;

const MEMBER_PROFILE_SELECT =
  "id, email, name, subscription_status, subscription_tier, password_set, email_unsubscribed, practice_streak, last_practiced_at, created_at, stripe_customer_id, timezone, fp_ref_id, fp_promoter_id";

export const getCurrentMemberProfile = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      member: null,
      authError,
      memberError: null,
    };
  }

  const { data: member, error: memberError } = await supabase
    .from("member")
    .select(MEMBER_PROFILE_SELECT)
    .eq("id", user.id)
    .single();

  return {
    user,
    member,
    authError: null,
    memberError,
  };
});
