import { getMemberNotes } from "@/lib/queries/get-member-notes";
import { JournalList } from "@/components/journal/JournalList";
import { NewJournalEntryButton } from "@/components/journal/NewJournalEntryButton";
import { PageHeader } from "@/components/member/PageHeader";
import { EmptyState } from "@/components/member/EmptyState";

/**
 * app/(member)/journal/page.tsx
 * Sprint 7: wider container, PageHeader, EmptyState, month grouping.
 * Sprint 10: "New entry" button added.
 * Sprint 11: hero mode on PageHeader, button moved into PageHeader right slot,
 *   EmptyState gets action CTA.
 */

export const metadata = {
  title: "Notes & Reflections — Positives",
  description: "Private reflections, quick notes, and gentle reminders from your practice.",
};

export default async function JournalPage() {
  const notes = await getMemberNotes();

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Journal"
        subtitle="Private notes and practice reflections, kept in one quiet place."
        hero
        right={<NewJournalEntryButton />}
      />

      <div className="member-container py-8 md:py-10">
        {notes.length === 0 ? (
          <EmptyState
            icon={
              <svg
                width="28"
                height="28"
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
            subtitle="Your reflections will appear here after you write your first note. Start with a quick private thought or a few lines after today's practice."
            action={<NewJournalEntryButton />}
          />
        ) : (
          <JournalList notes={notes} />
        )}
      </div>
    </div>
  );
}
