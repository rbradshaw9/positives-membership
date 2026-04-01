import { getMemberNotes } from "@/lib/queries/get-member-notes";
import { JournalList } from "@/components/journal/JournalList";
import { PageHeader } from "@/components/member/PageHeader";
import { EmptyState } from "@/components/member/EmptyState";

/**
 * app/(member)/journal/page.tsx
 * Sprint 7: wider container, PageHeader, EmptyState, month grouping.
 */

export const metadata = {
  title: "Your Notes — Positives",
  description: "Your personal reflections and notes from your practice.",
};

export default async function JournalPage() {
  const notes = await getMemberNotes();

  return (
    <div className="px-5 pt-10 pb-4 max-w-2xl mx-auto">
      <PageHeader
        title="Your Notes"
        subtitle="Reflections from your practice, in your own words."
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          }
          title="No notes yet"
          subtitle="Your reflections will appear here after you write your first note."
        />
      ) : (
        <JournalList notes={notes} />
      )}
    </div>
  );
}
