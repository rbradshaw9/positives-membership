"use client";

import { useState } from "react";
import { NoteSheet } from "@/components/notes/NoteSheet";

/**
 * components/journal/NewJournalEntryButton.tsx
 * Sprint 10: Floating "New Entry" button for the journal page.
 * Opens the NoteSheet with content_id = null (free-form entry).
 *
 * Client component — NoteSheet requires client-side interactivity.
 */

export function NewJournalEntryButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
        }}
        aria-label="Write a new journal entry"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New entry
      </button>

      <NoteSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        contentId={null}
        contentTitle="Free-form entry"
        onSaved={() => {
          setIsOpen(false);
          // Reload to show the new entry in the list
          window.location.reload();
        }}
      />
    </>
  );
}
