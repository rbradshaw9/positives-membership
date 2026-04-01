"use client";

import { useState } from "react";
import { NoteSheet } from "@/components/notes/NoteSheet";

/**
 * components/journal/NewJournalEntryButton.tsx
 * Sprint 10: floating "New Entry" button for the journal page.
 * Sprint 11: upgraded to .btn-primary — pill shape, gradient, glow.
 *   Removed inline style in favour of shared CSS class.
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
        className="btn-primary"
        aria-label="Write a new journal entry"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
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
          window.location.reload();
        }}
      />
    </>
  );
}
