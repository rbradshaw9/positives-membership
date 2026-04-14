import { createClient } from "@/lib/supabase/server";

/**
 * lib/queries/get-member-notes.ts
 * Returns all journal entries for the current member, most recent first.
 * Used by the /journal (notes archive) page.
 *
 * Joins with content to get the title for content-linked notes.
 */

export type MemberNote = {
  id: string;
  entry_text: string;
  created_at: string;
  updated_at: string;
  content_id: string | null;
  content_title: string | null;
  content_type: string | null;
  is_freeform: boolean;
};

export async function getMemberNotes(): Promise<MemberNote[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("journal")
    .select(
      `
      id,
      entry_text,
      created_at,
      updated_at,
      content_id,
      content:content_id (
        title,
        type
      )
    `
    )
    .eq("member_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[getMemberNotes] Supabase query error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const content = row.content as { title: string; type: string } | null;
    return {
      id: row.id,
      entry_text: row.entry_text,
      created_at: row.created_at,
      updated_at: row.updated_at,
      content_id: row.content_id,
      content_title: content?.title ?? null,
      content_type: content?.type ?? null,
      is_freeform: row.content_id == null,
    };
  });
}
