"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { saveNote, logJournalOpened } from "@/app/(member)/notes/actions";

/**
 * components/notes/NoteSheet.tsx
 * Responsive note-writing surface.
 *
 * Desktop (md+): fixed right slide-over panel, 380px wide.
 * Mobile (<md):  bottom sheet rising from the bottom.
 *
 * Sprint 3 change: onSaved now receives (isNew: boolean, savedText: string)
 * so parent components can update their local preview without a page reload.
 */

interface NoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string | null;
  contentTitle?: string;
  initialText?: string;
  onSaved?: (isNew: boolean, savedText: string) => void;
}

export function NoteSheet({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  initialText = "",
  onSaved,
}: NoteSheetProps) {
  const [text, setText] = useState(initialText);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const eventFiredRef = useRef(false);

  // Sync initialText when sheet opens with different content
  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setSaveState("idle");
      const t = setTimeout(() => textareaRef.current?.focus(), 80);

      if (!eventFiredRef.current) {
        eventFiredRef.current = true;
        startTransition(async () => {
          await logJournalOpened(contentId);
        });
      }

      return () => clearTimeout(t);
    }
  }, [isOpen, initialText, contentId]);

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll while sheet is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  async function handleSave() {
    if (!text.trim()) return;
    setSaveState("saving");

    const result = await saveNote(contentId, text);

    if (result.ok) {
      setSaveState("saved");
      // Pass the saved text back so parents can update their preview immediately
      onSaved?.(result.isNew, text.trim());
      setTimeout(() => {
        onClose();
        setSaveState("idle");
      }, 600);
    } else {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  function handleCancel() {
    setText(initialText);
    setSaveState("idle");
    onClose();
  }

  if (!isOpen) return null;

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : initialText
          ? "Update note"
          : "Save note";

  const headerTitle = contentTitle ? `Note — ${contentTitle}` : "Note";

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={handleCancel}
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] md:bg-foreground/10"
        aria-hidden="true"
      />

      {/* ── Desktop: right slide-over ─────────────────────────── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={headerTitle}
        className={[
          "fixed z-50 flex flex-col bg-card shadow-large",
          "hidden md:flex",
          "top-0 right-0 bottom-0 w-[380px]",
          "border-l border-border",
          "transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <NoteSheetContent
          headerTitle={headerTitle}
          text={text}
          setText={setText}
          saveLabel={saveLabel}
          saveState={saveState}
          onSave={handleSave}
          onCancel={handleCancel}
          textareaRef={textareaRef}
        />
      </aside>

      {/* ── Mobile: bottom sheet ──────────────────────────────── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={headerTitle}
        className={[
          "fixed z-50 flex flex-col bg-card shadow-large",
          "md:hidden",
          "bottom-0 left-0 right-0",
          "rounded-t-[1.75rem]",
          "max-h-[70dvh]",
          "transition-transform duration-200 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <NoteSheetContent
          headerTitle={headerTitle}
          text={text}
          setText={setText}
          saveLabel={saveLabel}
          saveState={saveState}
          onSave={handleSave}
          onCancel={handleCancel}
          textareaRef={textareaRef}
        />
      </aside>
    </>
  );
}

/* ── Shared inner content ───────────────────────────────────────────────────── */

interface ContentProps {
  headerTitle: string;
  text: string;
  setText: (v: string) => void;
  saveLabel: string;
  saveState: "idle" | "saving" | "saved" | "error";
  onSave: () => void;
  onCancel: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

function NoteSheetContent({
  headerTitle,
  text,
  setText,
  saveLabel,
  saveState,
  onSave,
  onCancel,
  textareaRef,
}: ContentProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 p-5 gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground truncate pr-4">
          {headerTitle}
        </p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close note"
          className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's coming up for you…"
        className={[
          "flex-1 min-h-0 resize-none rounded-xl p-4",
          "text-sm text-foreground leading-body placeholder:text-muted-foreground",
          "bg-background border border-border",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60",
          "transition-colors",
        ].join(" ")}
      />

      {saveState === "error" && (
        <p className="text-xs text-destructive text-center">
          Something went wrong. Please try again.
        </p>
      )}

      <div className="flex gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-muted hover:bg-border transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!text.trim() || saveState === "saving" || saveState === "saved"}
          className={[
            "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors",
            saveState === "saved"
              ? "bg-success text-white"
              : "bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
