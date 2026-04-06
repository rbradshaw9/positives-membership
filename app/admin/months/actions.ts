"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * app/admin/months/actions.ts
 * Server actions for monthly_practice CRUD and daily audio assignment.
 *
 * All mutations use the service-role client (bypasses RLS — admin only).
 * requireAdmin() is enforced at the layout level.
 */

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Bust all member-facing content caches */
function bustContentCaches() {
  const tags = [
    CACHE_TAGS.todayContent,
    CACHE_TAGS.weeklyContent,
    CACHE_TAGS.monthlyContent,
    CACHE_TAGS.libraryContent,
  ];
  for (const tag of tags) {
    try {
      // @ts-expect-error — unstable_cache tag revalidation
      revalidateTag(tag);
    } catch { /* noop */ }
  }
}

/** Map YYYY-MM to a human-readable label like "May 2026" */
function monthLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createMonthlyPractice(formData: FormData) {
  const monthYear = formData.get("month_year")?.toString().trim();

  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
    redirect("/admin/months?error=invalid_month");
  }

  const supabase = adminClient();

  // Check for duplicate
  const { data: existing } = await supabase
    .from("monthly_practice")
    .select("id")
    .eq("month_year", monthYear)
    .maybeSingle();

  if (existing) {
    redirect(`/admin/months/${existing.id}`);
  }

  const { data, error } = await supabase
    .from("monthly_practice")
    .insert({
      month_year: monthYear,
      label: monthLabel(monthYear),
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createMonthlyPractice] Error:", error?.message);
    redirect("/admin/months?error=create_failed");
  }

  redirect(`/admin/months/${data.id}`);
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateMonthlyPractice(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) redirect("/admin/months?error=missing_id");

  const description = formData.get("description")?.toString().trim() || null;
  const adminNotes = formData.get("admin_notes")?.toString().trim() || null;

  const supabase = adminClient();
  const { error } = await supabase
    .from("monthly_practice")
    .update({
      description,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateMonthlyPractice] Error:", error.message);
  }

  redirect(`/admin/months/${id}?success=updated`);
}

// ─── Publish Entire Month ───────────────────────────────────────────────────

export async function publishEntireMonth(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) redirect("/admin/months?error=missing_id");

  const supabase = adminClient();

  // Set monthly_practice status to published
  const { error: monthError } = await supabase
    .from("monthly_practice")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (monthError) {
    console.error("[publishEntireMonth] Month error:", monthError.message);
  }

  // Set all child content to published
  const { error: contentError } = await supabase
    .from("content")
    .update({ status: "published" })
    .eq("monthly_practice_id", id)
    .neq("status", "published");

  if (contentError) {
    console.error("[publishEntireMonth] Content error:", contentError.message);
  }

  bustContentCaches();
  redirect(`/admin/months/${id}?success=published`);
}

// ─── Assign daily audio to a date slot ──────────────────────────────────────

export async function assignDailyAudio(formData: FormData) {
  const contentId = formData.get("content_id")?.toString();
  const monthId = formData.get("month_id")?.toString();
  const publishDate = formData.get("publish_date")?.toString();
  const monthYear = formData.get("month_year")?.toString();

  if (!contentId || !monthId || !publishDate) {
    redirect(`/admin/months/${monthId ?? ""}?error=missing_fields`);
  }

  const supabase = adminClient();
  const { error } = await supabase
    .from("content")
    .update({
      publish_date: publishDate,
      month_year: monthYear || null,
      monthly_practice_id: monthId,
    })
    .eq("id", contentId);

  if (error) {
    console.error("[assignDailyAudio] Error:", error.message);
  }

  bustContentCaches();
  redirect(`/admin/months/${monthId}`);
}

// ─── Unassign daily audio from a date slot ──────────────────────────────────

export async function unassignDailyAudio(formData: FormData) {
  const contentId = formData.get("content_id")?.toString();
  const monthId = formData.get("month_id")?.toString();

  if (!contentId) return;

  const supabase = adminClient();
  const { error } = await supabase
    .from("content")
    .update({
      publish_date: null,
      month_year: null,
      monthly_practice_id: null,
    })
    .eq("id", contentId);

  if (error) {
    console.error("[unassignDailyAudio] Error:", error.message);
  }

  bustContentCaches();
  redirect(`/admin/months/${monthId ?? ""}`);
}

// ─── Swap / move daily audio between date slots ──────────────────────────────

export async function swapDailyAudios(formData: FormData): Promise<void> {
  const sourceContentId = formData.get("source_content_id")?.toString();
  const targetContentId = formData.get("target_content_id")?.toString() || null;
  const sourceDate = formData.get("source_date")?.toString();
  const targetDate = formData.get("target_date")?.toString();
  const monthId = formData.get("month_id")?.toString();

  if (!sourceContentId || !sourceDate || !targetDate || !monthId) return;

  const supabase = adminClient();

  const { error: e1 } = await supabase
    .from("content")
    .update({ publish_date: targetDate })
    .eq("id", sourceContentId);

  if (e1) {
    console.error("[swapDailyAudios] Error updating source:", e1.message);
    return;
  }

  if (targetContentId) {
    const { error: e2 } = await supabase
      .from("content")
      .update({ publish_date: sourceDate })
      .eq("id", targetContentId);

    if (e2) {
      console.error("[swapDailyAudios] Error updating target:", e2.message);
    }
  }

  bustContentCaches();
  refresh();
}

// ─── Create or update Masterclass (monthly_theme) ───────────────────────────

export async function createOrUpdateMasterclass(formData: FormData) {
  const monthId = formData.get("month_id")?.toString();
  const monthYear = formData.get("month_year")?.toString();
  const existingId = formData.get("content_id")?.toString() || null;
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const excerpt = formData.get("excerpt")?.toString().trim() || null;
  const body = formData.get("body")?.toString().trim() || null;
  const reflectionPrompt = formData.get("reflection_prompt")?.toString().trim() || null;
  const mediaUrl = formData.get("media_url")?.toString().trim() || null;
  const status = formData.get("status")?.toString() || "draft";

  if (!monthId || !title) {
    redirect(`/admin/months/${monthId ?? ""}?error=missing_fields`);
  }

  const supabase = adminClient();

  // Parse media URL to detect Vimeo/YouTube
  let vimeoVideoId: string | null = null;
  let youtubeVideoId: string | null = null;
  if (mediaUrl) {
    const vimeoMatch = mediaUrl.match(/vimeo\.com\/(\d+)/);
    const ytMatch = mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (vimeoMatch) vimeoVideoId = vimeoMatch[1];
    if (ytMatch) youtubeVideoId = ytMatch[1];
  }

  const row = {
    type: "monthly_theme" as const,
    title,
    description,
    excerpt,
    body,
    reflection_prompt: reflectionPrompt,
    vimeo_video_id: vimeoVideoId,
    youtube_video_id: youtubeVideoId,
    status,
    month_year: monthYear,
    monthly_practice_id: monthId,
    source: "admin" as const,
    updated_at: new Date().toISOString(),
  };

  if (existingId) {
    const { error } = await supabase
      .from("content")
      .update(row)
      .eq("id", existingId);
    if (error) console.error("[createOrUpdateMasterclass] Update error:", error.message);
  } else {
    const { error } = await supabase.from("content").insert(row);
    if (error) console.error("[createOrUpdateMasterclass] Insert error:", error.message);
  }

  bustContentCaches();
  redirect(`/admin/months/${monthId}?success=updated`);
}

// ─── Create or update Weekly Reflection ─────────────────────────────────────

export async function createOrUpdateWeekly(formData: FormData) {
  const monthId = formData.get("month_id")?.toString();
  const monthYear = formData.get("month_year")?.toString();
  const existingId = formData.get("content_id")?.toString() || null;
  const title = formData.get("title")?.toString().trim();
  const weekStart = formData.get("week_start")?.toString();
  const excerpt = formData.get("excerpt")?.toString().trim() || null;
  const body = formData.get("body")?.toString().trim() || null;
  const reflectionPrompt = formData.get("reflection_prompt")?.toString().trim() || null;
  const status = formData.get("status")?.toString() || "draft";

  if (!monthId || !title || !weekStart) {
    redirect(`/admin/months/${monthId ?? ""}?error=missing_fields`);
  }

  const supabase = adminClient();

  const row = {
    type: "weekly_principle" as const,
    title,
    excerpt,
    body,
    reflection_prompt: reflectionPrompt,
    week_start: weekStart,
    month_year: monthYear,
    monthly_practice_id: monthId,
    status,
    source: "admin" as const,
    updated_at: new Date().toISOString(),
  };

  if (existingId) {
    const { error } = await supabase
      .from("content")
      .update(row)
      .eq("id", existingId);
    if (error) console.error("[createOrUpdateWeekly] Update error:", error.message);
  } else {
    const { error } = await supabase.from("content").insert(row);
    if (error) console.error("[createOrUpdateWeekly] Insert error:", error.message);
  }

  bustContentCaches();
  redirect(`/admin/months/${monthId}?success=updated`);
}

// ─── Quick Create Daily Audio ───────────────────────────────────────────────

export async function quickCreateDaily(formData: FormData) {
  const monthId = formData.get("month_id")?.toString();
  const monthYear = formData.get("month_year")?.toString();
  const publishDate = formData.get("publish_date")?.toString();
  const title = formData.get("title")?.toString().trim();
  const castosUrl = formData.get("castos_episode_url")?.toString().trim() || null;
  const s3Key = formData.get("s3_audio_key")?.toString().trim() || null;
  const durationStr = formData.get("duration_seconds")?.toString();
  const status = formData.get("status")?.toString() || "draft";

  if (!monthId || !title || !publishDate) {
    redirect(`/admin/months/${monthId ?? ""}?error=missing_fields`);
  }

  const supabase = adminClient();

  const { error } = await supabase.from("content").insert({
    type: "daily_audio" as const,
    title,
    publish_date: publishDate,
    month_year: monthYear,
    monthly_practice_id: monthId,
    castos_episode_url: castosUrl,
    s3_audio_key: s3Key,
    duration_seconds: durationStr ? parseInt(durationStr, 10) : null,
    status,
    source: "admin" as const,
  });

  if (error) {
    console.error("[quickCreateDaily] Insert error:", error.message);
  }

  bustContentCaches();
  redirect(`/admin/months/${monthId}?success=updated`);
}
