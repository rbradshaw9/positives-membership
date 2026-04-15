"use server";

import { createClient } from "@/lib/supabase/server";
import { POINT_VALUES, awardMemberPoints } from "@/lib/points/award";

/**
 * app/(member)/notes/actions.ts
 * Server actions for the Notes / Journal system.
 *
 * The journal table stores both free-form notes and reflections linked to
 * specific content. We now treat each row as a true entry rather than an
 * upsert target so members can save multiple reflections over time.
 */

export type JournalActionResult =
  | { ok: true; noteId: string; isNew: boolean }
  | { ok: false; error: string };

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function logNoteEvent({
  memberId,
  contentId,
  eventType,
  noteId,
}: {
  memberId: string;
  contentId: string | null;
  eventType: "note_created" | "note_updated" | "journal_opened" | "note_deleted";
  noteId?: string;
}) {
  const supabase = await createClient();
  await supabase.from("activity_event").insert({
    member_id: memberId,
    event_type: eventType,
    content_id: contentId,
    metadata: noteId ? { note_id: noteId } : null,
  });
}

export async function createJournalEntry(
  contentId: string | null,
  entryText: string
): Promise<JournalActionResult> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "Not authenticated" };
  }

  const trimmedText = entryText.trim();
  if (!trimmedText) {
    return { ok: false, error: "Note cannot be empty" };
  }

  const { data: created, error } = await supabase
    .from("journal")
    .insert({
      member_id: userId,
      content_id: contentId,
      entry_text: trimmedText,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[createJournalEntry] insert error:", error?.message);
    return { ok: false, error: "Could not save note" };
  }

  void logNoteEvent({
    memberId: userId,
    contentId,
    eventType: "note_created",
    noteId: created.id,
  });

  void awardMemberPoints({
    memberId: userId,
    delta: POINT_VALUES.journalEntry,
    reason: "journal_entry",
    description: "Reflection saved",
    contentId,
    idempotencyKey: `journal_entry:${created.id}`,
    metadata: { note_id: created.id },
  });

  return { ok: true, noteId: created.id, isNew: true };
}

export async function updateJournalEntry(
  noteId: string,
  entryText: string
): Promise<JournalActionResult> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "Not authenticated" };
  }

  const trimmedText = entryText.trim();
  if (!trimmedText) {
    return { ok: false, error: "Note cannot be empty" };
  }

  const { data: existing, error: existingError } = await supabase
    .from("journal")
    .select("id, content_id")
    .eq("id", noteId)
    .eq("member_id", userId)
    .maybeSingle();

  if (existingError || !existing) {
    console.error("[updateJournalEntry] lookup error:", existingError?.message);
    return { ok: false, error: "Could not find that note" };
  }

  const { error } = await supabase
    .from("journal")
    .update({ entry_text: trimmedText })
    .eq("id", noteId)
    .eq("member_id", userId);

  if (error) {
    console.error("[updateJournalEntry] update error:", error.message);
    return { ok: false, error: "Could not save note" };
  }

  void logNoteEvent({
    memberId: userId,
    contentId: existing.content_id,
    eventType: "note_updated",
    noteId,
  });

  return { ok: true, noteId, isNew: false };
}

export async function deleteJournalEntry(
  noteId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "Not authenticated" };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("journal")
    .select("id, content_id")
    .eq("id", noteId)
    .eq("member_id", userId)
    .maybeSingle();

  if (lookupError || !existing) {
    console.error("[deleteJournalEntry] lookup error:", lookupError?.message);
    return { ok: false, error: "Could not find that note" };
  }

  const { error } = await supabase
    .from("journal")
    .delete()
    .eq("id", noteId)
    .eq("member_id", userId);

  if (error) {
    console.error("[deleteJournalEntry] delete error:", error.message);
    return { ok: false, error: "Could not delete note" };
  }

  void logNoteEvent({
    memberId: userId,
    contentId: existing.content_id,
    eventType: "note_deleted",
    noteId,
  });

  return { ok: true };
}

/**
 * logJournalOpened — fire journal_opened event when member opens note surface.
 * Called from client component, best-effort only.
 */
export async function logJournalOpened(contentId: string | null): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;

  await logNoteEvent({
    memberId: userId,
    contentId,
    eventType: "journal_opened",
  });
}

/**
 * getNoteForContent — returns the most recently updated reflection for a piece
 * of content. Kept for convenience in places that only need the latest entry.
 */
export async function getNoteForContent(
  contentId: string
): Promise<{ id: string; entry_text: string } | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("journal")
    .select("id, entry_text")
    .eq("member_id", user.id)
    .eq("content_id", contentId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
