"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import {
  parseMediaUrl,
  mediaColumnsFromParsed,
} from "@/lib/media/parse-media-url";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * app/admin/content/actions.ts
 * Server actions for admin content management.
 *
 * Sprint 5 update — handles richer content fields (body, reflection_prompt,
 * download_url) and media URL auto-detection for Weekly/Monthly types.
 *
 * All mutations use the service-role client (bypasses RLS — admin only).
 * Each action explicitly checks requireAdmin() because server actions can be
 * invoked independently of the admin layout boundary.
 */

type ContentInput = {
  id?: string; // undefined = create, set = update
  type: string;
  title: string;
  excerpt: string;
  description: string;
  body: string;
  reflection_prompt: string;
  download_url: string;
  resource_links: string; // JSON string from hidden input
  status: string;
  publish_date: string;
  week_start: string;
  month_year: string;
  duration_seconds: string;
  castos_episode_url: string;
  s3_audio_key: string;
  join_url: string;   // Sprint 10 patch: dedicated coaching Zoom URL
  media_url: string; // single paste field — auto-detected
  admin_notes: string;
  tier_min: string;   // Sprint 10
  starts_at: string;  // Sprint 10 (ISO datetime-local string)
  send_reminders: boolean;
  send_replay_email: boolean;
};

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function parseFormData(formData: FormData): ContentInput {
  const sendReminderValues = formData.getAll("send_reminders").map(String);
  const sendReplayValues = formData.getAll("send_replay_email").map(String);

  return {
    id: formData.get("id")?.toString() || undefined,
    type: formData.get("type")?.toString() ?? "daily_audio",
    title: formData.get("title")?.toString().trim() ?? "",
    excerpt: formData.get("excerpt")?.toString().trim() ?? "",
    description: formData.get("description")?.toString().trim() ?? "",
    body: formData.get("body")?.toString().trim() ?? "",
    reflection_prompt: formData.get("reflection_prompt")?.toString().trim() ?? "",
    download_url: formData.get("download_url")?.toString().trim() ?? "",
    resource_links: formData.get("resource_links")?.toString() ?? "[]",
    status: formData.get("status")?.toString() ?? "draft",
    publish_date: formData.get("publish_date")?.toString() ?? "",
    week_start: formData.get("week_start")?.toString() ?? "",
    month_year: formData.get("month_year")?.toString() ?? "",
    duration_seconds: formData.get("duration_seconds")?.toString() ?? "",
    castos_episode_url: formData.get("castos_episode_url")?.toString().trim() ?? "",
    s3_audio_key: formData.get("s3_audio_key")?.toString().trim() ?? "",
    join_url: formData.get("join_url")?.toString().trim() ?? "",
    media_url: formData.get("media_url")?.toString().trim() ?? "",
    admin_notes: formData.get("admin_notes")?.toString().trim() ?? "",
    tier_min: formData.get("tier_min")?.toString() ?? "",
    starts_at: formData.get("starts_at")?.toString() ?? "",
    send_reminders: sendReminderValues.length > 0
      ? sendReminderValues.includes("on")
      : true,
    send_replay_email: sendReplayValues.length > 0
      ? sendReplayValues.includes("on")
      : true,
  };
}

function buildRow(input: ContentInput) {
  const isDaily = input.type === "daily_audio";
  const isCoaching = input.type === "coaching_call";

  // Base row with all standard + new rich fields
  const row: Record<string, unknown> = {
    type: input.type,
    title: input.title,
    excerpt: input.excerpt || null,
    description: input.description || null,
    body: input.body || null,
    reflection_prompt: input.reflection_prompt || null,
    download_url: input.download_url || null,
    resource_links: (() => {
      try {
        const parsed = JSON.parse(input.resource_links);
        // resource_links is NOT NULL in DB (default '[]'::jsonb).
        // Must never write null — return empty array instead.
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
    status: input.status,
    is_active: input.status === "published",
    publish_date: input.publish_date || null,
    week_start: input.week_start || null,
    month_year: input.month_year || null,
    duration_seconds: input.duration_seconds
      ? parseInt(input.duration_seconds, 10)
      : null,
    admin_notes: input.admin_notes || null,
    source: "admin" as const,
    // Sprint 10 fields
    tier_min: input.tier_min || null,
    starts_at: input.starts_at ? new Date(input.starts_at).toISOString() : null,
    send_reminders: input.send_reminders,
    send_replay_email: input.send_replay_email,
  };

  if (isDaily) {
    // Daily audio uses explicit Castos/S3 fields
    row.castos_episode_url = input.castos_episode_url || null;
    row.s3_audio_key = input.s3_audio_key || null;
  } else if (isCoaching) {
    // Coaching: join_url holds the Zoom link (server-side only, never rendered in client JS)
    // castos_episode_url is NOT used for coaching — it stays reserved for podcast delivery
    row.join_url = input.join_url || null;
    row.vimeo_video_id = null;
    row.youtube_video_id = null;
    // Handle replay media URL if admin pastes a Vimeo/YouTube URL after the call
    if (input.media_url) {
      const parsed = parseMediaUrl(input.media_url);
      const mediaColumns = mediaColumnsFromParsed(parsed);
      Object.assign(row, mediaColumns);
    }
  } else {
    // Weekly/Monthly: auto-detect media from the pasted URL
    if (input.media_url) {
      const parsed = parseMediaUrl(input.media_url);
      const mediaColumns = mediaColumnsFromParsed(parsed);
      Object.assign(row, mediaColumns);
    } else {
      // No media URL — clear video ID columns
      row.vimeo_video_id = null;
      row.youtube_video_id = null;
    }
  }

  return row;
}

function revalidateContentTags() {
  revalidateTag(CACHE_TAGS.todayContent, "max");
  revalidateTag(CACHE_TAGS.weeklyContent, "max");
  revalidateTag(CACHE_TAGS.monthlyContent, "max");
  revalidateTag(CACHE_TAGS.libraryContent, "max");
  revalidateTag(CACHE_TAGS.coachingContent, "max");
}

/** Resolve monthly_practice_id from month_year (null if not found) */
async function resolveMonthlyPracticeId(
  supabase: ReturnType<typeof adminClient>,
  monthYear: string
): Promise<string | null> {
  if (!monthYear) return null;
  const { data } = await supabase
    .from("monthly_practice")
    .select("id")
    .eq("month_year", monthYear)
    .maybeSingle();
  return data?.id ?? null;
}

/** Create a new content record */
export async function createContent(formData: FormData) {
  await requireAdmin();
  const input = parseFormData(formData);

  if (!input.title) {
    redirect("/admin/content/new?error=title_required");
  }

  const supabase = adminClient();
  const row = buildRow(input);

  // Auto-link to parent monthly_practice if month_year is set
  if (input.month_year) {
    row.monthly_practice_id = await resolveMonthlyPracticeId(supabase, input.month_year);
  }

  const { error } = await supabase.from("content").insert(row);

  if (error) {
    console.error("[admin/createContent] Insert error:", error.message);
    redirect("/admin/content/new?error=insert_failed");
  }

  revalidateContentTags();

  redirect("/admin/content?success=created");
}

/** Update an existing content record */
export async function updateContent(formData: FormData) {
  await requireAdmin();
  const input = parseFormData(formData);

  if (!input.id) redirect("/admin/content?error=missing_id");
  if (!input.title) redirect(`/admin/content/${input.id}/edit?error=title_required`);

  const supabase = adminClient();
  const row = buildRow(input);

  // Auto-link to parent monthly_practice if month_year is set
  if (input.month_year) {
    row.monthly_practice_id = await resolveMonthlyPracticeId(supabase, input.month_year);
  }

  const { error } = await supabase
    .from("content")
    .update(row)
    .eq("id", input.id);

  if (error) {
    console.error("[admin/updateContent] Update error:", error.message);
    redirect(`/admin/content/${input.id}/edit?error=update_failed`);
  }

  revalidateContentTags();

  redirect("/admin/content?success=updated");
}

/** Toggle status between published ↔ draft (quick publish) */
export async function togglePublish(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  const current = formData.get("current_status")?.toString();

  if (!id) return;

  const newStatus = current === "published" ? "draft" : "published";

  const supabase = adminClient();
  await supabase
    .from("content")
    .update({
      status: newStatus,
      is_active: newStatus === "published",
    })
    .eq("id", id);

  revalidateContentTags();

  redirect("/admin/content");
}
