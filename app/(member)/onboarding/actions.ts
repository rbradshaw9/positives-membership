"use server";

import { revalidatePath } from "next/cache";
import {
  MEMBER_ONBOARDING_TOUR_KEY,
  MEMBER_ONBOARDING_TOUR_STEP_IDS,
  type MemberTourStatus,
} from "@/lib/onboarding/member-tour";
import { createClient } from "@/lib/supabase/server";

type SaveMemberTourStateInput = {
  status: MemberTourStatus;
  lastStep?: string | null;
};

const allowedStatuses = new Set<MemberTourStatus>([
  "not_started",
  "started",
  "dismissed",
  "completed",
]);

export async function saveMemberTourState(input: SaveMemberTourStateInput) {
  if (!allowedStatuses.has(input.status)) {
    return { error: "Invalid tour status." };
  }

  const lastStep = input.lastStep ?? null;
  if (lastStep && !MEMBER_ONBOARDING_TOUR_STEP_IDS.includes(lastStep)) {
    return { error: "Invalid tour step." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update tour progress." };
  }

  const now = new Date().toISOString();
  const statusTimestamps =
    input.status === "completed"
      ? { completed_at: now, dismissed_at: null }
      : input.status === "dismissed"
        ? { completed_at: null, dismissed_at: now }
        : input.status === "started"
          ? { completed_at: null, dismissed_at: null }
          : { completed_at: null, dismissed_at: null };

  const { error } = await supabase.from("member_onboarding_tour").upsert(
    {
      member_id: user.id,
      tour_key: MEMBER_ONBOARDING_TOUR_KEY,
      status: input.status,
      last_step: lastStep,
      started_at: input.status === "started" ? now : undefined,
      ...statusTimestamps,
    },
    { onConflict: "member_id,tour_key" }
  );

  if (error) {
    console.error("[member-tour] Failed to save tour state:", error.message);
    return { error: "Could not save tour progress right now." };
  }

  revalidatePath("/today");
  revalidatePath("/account");
  revalidatePath("/account/affiliate");

  return { success: true };
}
