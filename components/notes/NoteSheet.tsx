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
 * Sprint 3: onSaved receives (isNew: boolean, savedText: string).
 * Sprint 11: visual polish —
 *   - Header: icon + text-sm font-medium (replaces uppercase xs)
 *   - Textarea: bg-surface-tint + inset shadow, text-[15px]
 *   - Save button: .btn-primary (gradient pill)
 *   - Cancel button: ghost treatment (transparent bg, border)
 *   - Mobile grab handle: wider, softer color
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
        ? "Saved ✓"
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
        {/* Grab handle — wider and softer */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div
            className="w-12 h-1 rounded-full"
            style={{ background: "rgba(104,112,122,0.3)" }}
          />
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
      {/* Header — icon + title (replaces all-caps xs text) */}
      <div className="flex items-center justify-between flex-shrink-0 border-b border-border pb-4">
        <div className="flex items-center gap-2 min-w-0">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-muted-foreground flex-shrink-0"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <p className="text-sm font-medium text-foreground truncate">{headerTitle}</p>
        </div>
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

      {/* Textarea — warm writing surface */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's coming up for you…"
        className={[
          "flex-1 min-h-0 resize-none rounded-xl p-4",
          "text-[15px] text-foreground leading-body placeholder:text-muted-foreground",
          "border border-border",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60",
          "transition-colors",
        ].join(" ")}
        style={{
          background: "var(--color-surface-tint)",
          boxShadow: "inset 0 2px 4px rgba(18,20,23,0.03)",
        }}
      />

      {saveState === "error" && (
        <p className="text-xs text-destructive text-center">
          Something went wrong. Please try again.
        </p>
      )}

      <div className="flex gap-3 flex-shrink-0">
        {/* Cancel — ghost treatment */}
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-full text-sm font-medium border border-border bg-transparent text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>

        {/* Save — .btn-primary or success state */}
        <button
          type="button"
          onClick={onSave}
          disabled={!text.trim() || saveState === "saving" || saveState === "saved"}
          className={
            saveState === "saved"
              ? "flex-1 py-2.5 rounded-full text-sm font-medium bg-success text-white"
              : "btn-primary flex-1"
          }
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
