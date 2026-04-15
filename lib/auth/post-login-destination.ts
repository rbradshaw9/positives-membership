import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import type { Enums } from "@/types/supabase";

type AuthUser = { id: string };

type SupabaseLike = {
  auth: {
    getUser: () => Promise<{ data: { user: AuthUser | null } }>;
  };
  from: (table: string) => unknown;
};

function safePath(path: string | null | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/today";
  return path;
}

function courseOwnerDestination(next: string) {
  if (
    next.startsWith("/library") ||
    next.startsWith("/account") ||
    next.startsWith("/courses")
  ) {
    return next;
  }

  return "/library";
}

export async function resolvePostLoginDestination(
  supabaseClient: SupabaseLike,
  requestedNext: string | null | undefined
) {
  const next = safePath(requestedNext);
  const supabase = asLooseSupabaseClient(supabaseClient);
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) return "/login";

  const { data: member } = await supabase
    .from("member")
    .select<{ id: string; subscription_status: Enums<"subscription_status"> | null }>(
      "id, subscription_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (hasActiveMemberAccess(member?.subscription_status)) return next;
  if (member?.subscription_status === "past_due") return "/account";

  if (member?.id) {
    const { data: entitlement } = await supabase
      .from("course_entitlement")
      .select<{ id: string }>("id")
      .eq("member_id", member.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (entitlement) return courseOwnerDestination(next);
  }

  return "/join";
}
