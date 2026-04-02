"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

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

  redirect(`/admin/months/${monthId ?? ""}`);
}

// ─── Swap / move daily audio between date slots ──────────────────────────────

/**
 * Moves a daily audio to a different date slot.
 * If the target slot already has content, the two audios swap dates.
 * Calls refresh() so the grid re-renders in place without full navigation.
 */
export async function swapDailyAudios(formData: FormData): Promise<void> {
  const sourceContentId = formData.get("source_content_id")?.toString();
  const targetContentId = formData.get("target_content_id")?.toString() || null;
  const sourceDate = formData.get("source_date")?.toString();
  const targetDate = formData.get("target_date")?.toString();
  const monthId = formData.get("month_id")?.toString();

  if (!sourceContentId || !sourceDate || !targetDate || !monthId) return;

  const supabase = adminClient();

  // Move source content to target date
  const { error: e1 } = await supabase
    .from("content")
    .update({ publish_date: targetDate })
    .eq("id", sourceContentId);

  if (e1) {
    console.error("[swapDailyAudios] Error updating source:", e1.message);
    return;
  }

  // If target slot had content, move it back to the source date
  if (targetContentId) {
    const { error: e2 } = await supabase
      .from("content")
      .update({ publish_date: sourceDate })
      .eq("id", targetContentId);

    if (e2) {
      console.error("[swapDailyAudios] Error updating target:", e2.message);
    }
  }

  refresh();
}
