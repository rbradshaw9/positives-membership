"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

/**
 * app/admin/content/actions.ts
 * Server actions for admin content management.
 *
 * All mutations use the service-role client (bypasses RLS — admin only).
 * requireAdmin() is enforced at the layout level.
 */

type ContentInput = {
  id?: string; // undefined = create, set = update
  type: string;
  title: string;
  excerpt: string;
  description: string;
  status: string;
  publish_date: string;
  week_start: string;
  month_year: string;
  duration_seconds: string;
  castos_episode_url: string;
  s3_audio_key: string;
  admin_notes: string;
};

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function parseFormData(formData: FormData): ContentInput {
  return {
    id: formData.get("id")?.toString() || undefined,
    type: formData.get("type")?.toString() ?? "daily_audio",
    title: formData.get("title")?.toString().trim() ?? "",
    excerpt: formData.get("excerpt")?.toString().trim() ?? "",
    description: formData.get("description")?.toString().trim() ?? "",
    status: formData.get("status")?.toString() ?? "draft",
    publish_date: formData.get("publish_date")?.toString() ?? "",
    week_start: formData.get("week_start")?.toString() ?? "",
    month_year: formData.get("month_year")?.toString() ?? "",
    duration_seconds: formData.get("duration_seconds")?.toString() ?? "",
    castos_episode_url: formData.get("castos_episode_url")?.toString().trim() ?? "",
    s3_audio_key: formData.get("s3_audio_key")?.toString().trim() ?? "",
    admin_notes: formData.get("admin_notes")?.toString().trim() ?? "",
  };
}

function buildRow(input: ContentInput) {
  return {
    type: input.type,
    title: input.title,
    excerpt: input.excerpt || null,
    description: input.description || null,
    status: input.status,
    // Date fields — only set if relevant for the type
    publish_date: input.publish_date || null,
    week_start: input.week_start || null,
    month_year: input.month_year || null,
    duration_seconds: input.duration_seconds ? parseInt(input.duration_seconds, 10) : null,
    castos_episode_url: input.castos_episode_url || null,
    s3_audio_key: input.s3_audio_key || null,
    admin_notes: input.admin_notes || null,
    source: "admin" as const,
  };
}

/** Create a new content record */
export async function createContent(formData: FormData) {
  const input = parseFormData(formData);

  if (!input.title) {
    redirect("/admin/content/new?error=title_required");
  }

  const supabase = adminClient();
  const { error } = await supabase.from("content").insert(buildRow(input));

  if (error) {
    console.error("[admin/createContent] Insert error:", error.message);
    redirect("/admin/content/new?error=insert_failed");
  }

  redirect("/admin/content?success=created");
}

/** Update an existing content record */
export async function updateContent(formData: FormData) {
  const input = parseFormData(formData);

  if (!input.id) redirect("/admin/content?error=missing_id");
  if (!input.title) redirect(`/admin/content/${input.id}/edit?error=title_required`);

  const supabase = adminClient();
  const { error } = await supabase
    .from("content")
    .update(buildRow(input))
    .eq("id", input.id);

  if (error) {
    console.error("[admin/updateContent] Update error:", error.message);
    redirect(`/admin/content/${input.id}/edit?error=update_failed`);
  }

  redirect("/admin/content?success=updated");
}

/** Toggle status between published ↔ draft (quick publish) */
export async function togglePublish(formData: FormData) {
  const id = formData.get("id")?.toString();
  const current = formData.get("current_status")?.toString();

  if (!id) return;

  const newStatus = current === "published" ? "draft" : "published";

  const supabase = adminClient();
  await supabase.from("content").update({ status: newStatus }).eq("id", id);

  redirect("/admin/content");
}
