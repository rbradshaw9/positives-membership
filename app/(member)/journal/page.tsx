import { getMemberNotes } from "@/lib/queries/get-member-notes";
import { JournalList } from "@/components/journal/JournalList";

/**
 * app/(member)/journal/page.tsx
 * Notes archive — all the member's past reflections, most recently updated first.
 *
 * Shows content context (title + type) for content-linked notes.
 * Freeform notes (content_id = null) show as standalone entries.
 *
 * Each note is tappable to re-open the NoteSheet for editing — handled
 * by the JournalList client component.
 */

export const metadata = {
  title: "Your Notes — Positives",
  description: "Your personal reflections and notes from your practice.",
};

export default async function JournalPage() {
  const notes = await getMemberNotes();

  return (
    <div className="px-5 py-8 max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          Your Notes
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-body">
          Reflections from your practice, in your own words.
        </p>
      </header>

      {notes.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground/40"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <p className="text-muted-foreground text-sm max-w-[220px] leading-body text-center">
            Your reflections will appear here after you write your first note.
          </p>
        </div>
      ) : (
        <JournalList notes={notes} />
      )}
    </div>
  );
}
