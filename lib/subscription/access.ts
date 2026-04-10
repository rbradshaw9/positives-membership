import type { Enums } from "@/types/supabase";

type SubscriptionStatus = Enums<"subscription_status"> | null | undefined;

export function hasActiveMemberAccess(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}
