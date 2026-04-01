"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * app/(member)/notes/actions.ts
 * Server actions for the Notes / Journal system.
 *
 * saveNote — create or update a note for a content item.
 * logNoteEvent — fire activity_event for note lifecycle events.
 *
 * One note per member per content item. On re-open, the existing note is
 * loaded and editing it calls saveNote which upserts via the unique pair.
 *
 * Fails quietly from the member's perspective — tracking failure never
 * surfaces as a UI error.
 */

export type SaveNoteResult =
  | { ok: true; noteId: string; isNew: boolean }
  | { ok: false; error: string };

/**
 * saveNote — upsert a journal entry for (member, content).
 *
 * If no note exists for this member+content pair, inserts a new row.
 * If a note already exists, updates entry_text (and updated_at via trigger).
 *
 * contentId is required for Today card notes. Pass null for freeform notes
 * (not used in Sprint 2 but the signature is forward-compatible).
 */
export async function saveNote(
  contentId: string | null,
  entryText: string
): Promise<SaveNoteResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const trimmedText = entryText.trim();
  if (!trimmedText) {
    return { ok: false, error: "Note cannot be empty" };
  }

  // Check for an existing note for this member+content pair
  const existingQuery = supabase
    .from("journal")
    .select("id")
    .eq("member_id", user.id);

  if (contentId) {
    existingQuery.eq("content_id", contentId);
  } else {
    existingQuery.is("content_id", null);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    // Update existing note
    const { error } = await supabase
      .from("journal")
      .update({ entry_text: trimmedText })
      .eq("id", existing.id);

    if (error) {
      console.error("[saveNote] update error:", error.message);
      return { ok: false, error: "Could not save note" };
    }

    // Fire note_updated event (non-blocking, best-effort)
    void supabase.from("activity_event").insert({
      member_id: user.id,
      event_type: "note_updated",
      content_id: contentId,
      metadata: { note_id: existing.id },
    });

    return { ok: true, noteId: existing.id, isNew: false };
  } else {
    // Create new note
    const { data: created, error } = await supabase
      .from("journal")
      .insert({
        member_id: user.id,
        content_id: contentId,
        entry_text: trimmedText,
      })
      .select("id")
      .single();

    if (error || !created) {
      console.error("[saveNote] insert error:", error?.message);
      return { ok: false, error: "Could not save note" };
    }

    // Fire note_created event (non-blocking, best-effort)
    void supabase.from("activity_event").insert({
      member_id: user.id,
      event_type: "note_created",
      content_id: contentId,
      metadata: { note_id: created.id },
    });

    return { ok: true, noteId: created.id, isNew: true };
  }
}

/**
 * logJournalOpened — fire journal_opened event when member opens note surface.
 * Called from client component, best-effort only.
 */
export async function logJournalOpened(contentId: string | null): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("activity_event").insert({
    member_id: user.id,
    event_type: "journal_opened",
    content_id: contentId,
  });
}

/**
 * getNoteForContent — load an existing note for a member+content pair.
 * Used to pre-populate the NoteSheet on open.
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
    .maybeSingle();

  return data ?? null;
}
