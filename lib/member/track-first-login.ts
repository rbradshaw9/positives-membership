import { syncFirstLoginComplete } from "@/lib/activecampaign/sync";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

const LAST_SEEN_THROTTLE_MS = 15 * 60 * 1000;

/**
 * Records the first protected member-app entry and syncs the corresponding
 * lifecycle state into ActiveCampaign.
 *
 * We intentionally treat the first successful protected-route entry as the
 * first login milestone because that is the cleanest point for:
 * - ending the welcome/access automation
 * - starting post-login orientation
 */
export async function trackFirstMemberLogin(params: {
  memberId: string;
  email: string;
  firstLoginAt?: string | null;
  lastSeenAt?: string | null;
}): Promise<void> {
  // activity_event intentionally blocks member inserts via RLS, so this
  // milestone write must use the server-side admin client.
  const supabase = asLooseSupabaseClient(getAdminClient());
  const now = new Date();
  const seenAt = now.toISOString();
  const previousSeenAt = params.lastSeenAt ? new Date(params.lastSeenAt).getTime() : 0;
  const shouldUpdateLastSeen =
    !previousSeenAt || now.getTime() - previousSeenAt > LAST_SEEN_THROTTLE_MS;

  if (shouldUpdateLastSeen) {
    const { error: seenUpdateError } = await supabase
      .from("member")
      .update({ last_seen_at: seenAt })
      .eq("id", params.memberId);

    if (seenUpdateError) {
      console.error("[first-login] last seen update failed:", seenUpdateError.message);
    }
  }

  if (params.firstLoginAt) {
    return;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("activity_event")
    .select<{ id: string }>("id")
    .eq("member_id", params.memberId)
    .eq("event_type", "session_start")
    .order("occurred_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[first-login] activity lookup failed:", lookupError.message);
    return;
  }

  if (existing?.id) {
    return;
  }

  const firstLoginAt = seenAt;

  const { error: firstLoginUpdateError } = await supabase
    .from("member")
    .update({ first_login_at: firstLoginAt })
    .eq("id", params.memberId)
    .is("first_login_at", null);

  if (firstLoginUpdateError) {
    console.error("[first-login] first login update failed:", firstLoginUpdateError.message);
  }

  const { error: insertError } = await supabase.from("activity_event").insert({
    member_id: params.memberId,
    event_type: "session_start",
    metadata: {
      source: "member_layout",
      milestone: "first_login_complete",
    },
    occurred_at: firstLoginAt,
  });

  if (insertError) {
    console.error("[first-login] activity insert failed:", insertError.message);
    return;
  }

  await syncFirstLoginComplete({
    email: params.email,
    firstLoginAt,
  });
}
