"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import {
  isCommunityModerationStatus,
  isCommunityReportStatus,
} from "@/lib/community/shared";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function saveCommunityTag(formData: FormData): Promise<void> {
  await requireAdminPermission("community.moderate");
  const supabase = asLooseSupabaseClient(getAdminClient());
  const tagId = clean(formData.get("tagId"));
  const label = clean(formData.get("label"));
  const slug = clean(formData.get("slug")).toLowerCase();
  const description = clean(formData.get("description"));
  const sortOrder = Number(clean(formData.get("sortOrder")) || "0");

  if (label.length < 2 || slug.length < 2) return;

  const payload = {
    label,
    slug,
    description: description || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  };

  const query = tagId
    ? supabase.from("community_tag").update(payload).eq("id", tagId)
    : supabase.from("community_tag").insert(payload);

  const { error } = await query;
  if (error) {
    console.error("[admin/community] save tag failed:", error.message);
    return;
  }

  revalidatePath("/community");
  revalidatePath("/admin/community");
}

export async function toggleCommunityTagActive(formData: FormData): Promise<void> {
  await requireAdminPermission("community.moderate");
  const supabase = asLooseSupabaseClient(getAdminClient());
  const tagId = clean(formData.get("tagId"));
  const isActive = clean(formData.get("isActive")) === "true";

  if (!tagId) return;

  const { error } = await supabase
    .from("community_tag")
    .update({ is_active: !isActive })
    .eq("id", tagId);

  if (error) {
    console.error("[admin/community] toggle tag failed:", error.message);
    return;
  }

  revalidatePath("/community");
  revalidatePath("/admin/community");
}

export async function updateCommunityThreadModeration(formData: FormData): Promise<void> {
  await requireAdminPermission("community.moderate");
  const supabase = asLooseSupabaseClient(getAdminClient());
  const threadId = clean(formData.get("threadId"));
  const moderationStatus = clean(formData.get("moderationStatus"));
  const pin = clean(formData.get("pin"));
  const feature = clean(formData.get("feature"));

  if (!threadId) return;

  const updates: Record<string, unknown> = {};
  if (moderationStatus) {
    if (!isCommunityModerationStatus(moderationStatus)) return;
    updates.moderation_status = moderationStatus;
  }
  if (pin) updates.is_pinned = pin === "true";
  if (feature) updates.is_featured = feature === "true";

  const { error } = await supabase.from("community_thread").update(updates).eq("id", threadId);
  if (error) {
    console.error("[admin/community] thread moderation failed:", error.message);
    return;
  }

  revalidatePath("/community");
  revalidatePath("/admin/community");
}

export async function updateCommunityPostModeration(formData: FormData): Promise<void> {
  await requireAdminPermission("community.moderate");
  const supabase = asLooseSupabaseClient(getAdminClient());
  const postId = clean(formData.get("postId"));
  const moderationStatus = clean(formData.get("moderationStatus"));
  const official = clean(formData.get("official"));

  if (!postId) return;

  const updates: Record<string, unknown> = {};
  if (moderationStatus) {
    if (!isCommunityModerationStatus(moderationStatus)) return;
    updates.moderation_status = moderationStatus;
  }
  if (official) {
    updates.is_official_answer = official === "true";
  }

  const { error } = await supabase.from("community_post").update(updates).eq("id", postId);
  if (error) {
    console.error("[admin/community] post moderation failed:", error.message);
    return;
  }

  revalidatePath("/community");
  revalidatePath("/admin/community");
}

export async function updateCommunityReportReview(formData: FormData): Promise<void> {
  const actor = await requireAdminPermission("community.moderate");
  const supabase = asLooseSupabaseClient(getAdminClient());
  const reportId = clean(formData.get("reportId"));
  const status = clean(formData.get("status"));
  const moderatorNote = clean(formData.get("moderatorNote"));

  if (!reportId || !isCommunityReportStatus(status)) return;

  const { error } = await supabase
    .from("community_report")
    .update({
      status,
      moderator_note: moderatorNote || null,
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    console.error("[admin/community] report review failed:", error.message);
    return;
  }

  revalidatePath("/admin/community");
}
