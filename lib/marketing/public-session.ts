import { createClient } from "@/lib/supabase/server";
import { hasActiveMemberAccess } from "@/lib/subscription/access";

export type PublicSessionState = {
  isAuthenticated: boolean;
  hasMemberAccess: boolean;
  signInHref: string;
  signInLabel: string;
  paidHref: string;
  paidShortLabel: string;
  paidActionLabel: string;
  paidSecondaryLabel: string;
  trialHref: string;
  trialActionLabel: string;
  watchHref: string;
};

export const ANONYMOUS_PUBLIC_SESSION_STATE: PublicSessionState = {
  isAuthenticated: false,
  hasMemberAccess: false,
  signInHref: "/login",
  signInLabel: "Sign in",
  paidHref: "/join",
  paidShortLabel: "Join",
  paidActionLabel: "Start your daily practice →",
  paidSecondaryLabel: "See pricing and levels",
  trialHref: "/try",
  trialActionLabel: "Start 7-day free trial →",
  watchHref: "/watch",
};

export async function getPublicSessionState(): Promise<PublicSessionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return ANONYMOUS_PUBLIC_SESSION_STATE;
  }

  const { data: member } = await supabase
    .from("member")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const hasMemberAccess = hasActiveMemberAccess(member?.subscription_status);

  return {
    isAuthenticated: true,
    hasMemberAccess,
    signInHref: "/today",
    signInLabel: "Today",
    paidHref: hasMemberAccess ? "/today" : "/join",
    paidShortLabel: hasMemberAccess ? "Today" : "Join",
    paidActionLabel: hasMemberAccess
      ? "Open today's practice →"
      : "Start your daily practice →",
    paidSecondaryLabel: hasMemberAccess
      ? "Open your member dashboard"
      : "See pricing and levels",
    trialHref: hasMemberAccess ? "/today" : "/try",
    trialActionLabel: hasMemberAccess
      ? "Open today's practice →"
      : "Start 7-day free trial →",
    watchHref: hasMemberAccess ? "/today" : "/watch",
  };
}
