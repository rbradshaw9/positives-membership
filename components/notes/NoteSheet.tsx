"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useTransition } from "react";
import {
  createJournalEntry,
  deleteJournalEntry,
  logJournalOpened,
  updateJournalEntry,
} from "@/app/(member)/notes/actions";

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
  noteId?: string | null;
  contentTitle?: string;
  initialText?: string;
  existingReflectionCount?: number;
  onSaved?: (result: { noteId: string; isNew: boolean; savedText: string }) => void;
  onDeleted?: (noteId: string) => void;
}

export function NoteSheet({
  isOpen,
  onClose,
  contentId,
  noteId = null,
  contentTitle,
  initialText = "",
  existingReflectionCount = 0,
  onSaved,
  onDeleted,
}: NoteSheetProps) {
  const [text, setText] = useState(initialText);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "deleting" | "error"
  >("idle");
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const eventFiredRef = useRef(false);
  const isEditing = Boolean(noteId);
  const [savedResult, setSavedResult] = useState<{
    noteId: string;
    isNew: boolean;
  } | null>(null);

  // Sync initialText when sheet opens with different content
  useEffect(() => {
    if (isOpen) {
      const t = window.setTimeout(() => {
        setText(initialText);
        setSaveState("idle");
        setSavedResult(null);
        textareaRef.current?.focus();
      }, 0);

      if (!eventFiredRef.current) {
        eventFiredRef.current = true;
        startTransition(async () => {
          await logJournalOpened(contentId);
        });
      }

      return () => window.clearTimeout(t);
    }

    eventFiredRef.current = false;
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

    const result = isEditing
      ? await updateJournalEntry(noteId!, text)
      : await createJournalEntry(contentId, text);

    if (result.ok) {
      setSaveState("saved");
      setSavedResult({
        noteId: result.noteId,
        isNew: result.isNew,
      });
      onSaved?.({
        noteId: result.noteId,
        isNew: result.isNew,
        savedText: text.trim(),
      });
      if (!contentId && !isEditing) {
        setTimeout(() => {
          onClose();
          setSaveState("idle");
          setSavedResult(null);
        }, 600);
      }
    } else {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  async function handleDelete() {
    if (!noteId) return;
    const confirmed = window.confirm("Delete this note? This can’t be undone.");
    if (!confirmed) return;

    setSaveState("deleting");
    const result = await deleteJournalEntry(noteId);

    if (result.ok) {
      onDeleted?.(noteId);
      onClose();
      setSaveState("idle");
      return;
    }

    setSaveState("error");
    setTimeout(() => setSaveState("idle"), 3000);
  }

  function handleCancel() {
    setText(initialText);
    setSaveState("idle");
    setSavedResult(null);
    onClose();
  }

  if (!isOpen) return null;

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved ✓"
        : saveState === "deleting"
          ? "Deleting…"
          : isEditing
            ? "Update note"
            : contentId
              ? "Save reflection"
              : "Save note";

  const headerTitle = isEditing ? "Edit note" : contentId ? "New reflection" : "New note";
  const helperText = isEditing
    ? "This stays private to you. Come back whenever you want to add more."
    : contentId
      ? existingReflectionCount > 0
        ? `You already have ${existingReflectionCount} reflection${existingReflectionCount === 1 ? "" : "s"} on this practice. This will add another.`
        : "A few sentences is enough. Save a quick reflection while it is still fresh."
      : "A private place for quick thoughts, reminders, or anything you want to return to later.";

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={handleCancel}
        className="fixed inset-0 z-[70] bg-foreground/20 backdrop-blur-[2px] md:bg-foreground/10"
        aria-hidden="true"
      />

      {/* ── Desktop: right slide-over ─────────────────────────── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={headerTitle}
        className={[
          "fixed z-[80] flex flex-col bg-card shadow-large",
          "hidden md:flex",
          "top-0 right-0 bottom-0 w-[380px]",
          "border-l border-border",
          "transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <NoteSheetContent
          headerTitle={headerTitle}
          contentTitle={contentTitle}
          helperText={helperText}
          text={text}
          setText={setText}
          saveLabel={saveLabel}
          saveState={saveState}
          savedResult={savedResult}
          isReflection={Boolean(contentId)}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={isEditing ? handleDelete : undefined}
          textareaRef={textareaRef}
        />
      </aside>

      {/* ── Mobile: bottom sheet ──────────────────────────────── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={headerTitle}
        className={[
          "fixed z-[80] flex flex-col bg-card shadow-large",
          "md:hidden",
          "bottom-0 left-0 right-0",
          "rounded-t-[1.75rem]",
          "max-h-[80dvh]",
          "transition-transform duration-200 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
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
          contentTitle={contentTitle}
          helperText={helperText}
          text={text}
          setText={setText}
          saveLabel={saveLabel}
          saveState={saveState}
          savedResult={savedResult}
          isReflection={Boolean(contentId)}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={isEditing ? handleDelete : undefined}
          textareaRef={textareaRef}
        />
      </aside>
    </>
  );
}

/* ── Shared inner content ───────────────────────────────────────────────────── */

interface ContentProps {
  headerTitle: string;
  contentTitle?: string;
  helperText: string;
  text: string;
  setText: (v: string) => void;
  saveLabel: string;
  saveState: "idle" | "saving" | "saved" | "deleting" | "error";
  savedResult: { noteId: string; isNew: boolean } | null;
  isReflection: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

function NoteSheetContent({
  headerTitle,
  contentTitle,
  helperText,
  text,
  setText,
  saveLabel,
  saveState,
  savedResult,
  isReflection,
  onSave,
  onCancel,
  onDelete,
  textareaRef,
}: ContentProps) {
  if (saveState === "saved" && savedResult) {
    return (
      <div className="flex flex-1 flex-col justify-between gap-5 p-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {isReflection ? "Reflection saved" : "Note saved"}
            </p>
            {contentTitle ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{contentTitle}</p>
            ) : null}
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

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-5">
          <p className="text-sm font-semibold text-emerald-900">
            {isReflection ? "Your reflection is saved." : "Your note is saved."}
          </p>
          <p className="mt-2 text-sm leading-body text-emerald-800/80">
            {isReflection
              ? "You can revisit private reflections any time from Journal in My Practice."
              : "You can revisit this note any time from Journal in My Practice."}
          </p>
        </div>

        <div
          className="flex gap-3"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full text-sm font-medium border border-border bg-transparent text-muted-foreground hover:bg-muted transition-colors"
          >
            Done
          </button>
          <Link href="/journal" className="btn-primary flex-1 text-center">
            Open Journal
          </Link>
        </div>
      </div>
    );
  }

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
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{headerTitle}</p>
            {contentTitle && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{contentTitle}</p>
            )}
          </div>
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

      <p className="text-sm leading-body text-muted-foreground">{helperText}</p>

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

      <div
        className="flex gap-3 flex-shrink-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={saveState === "saving" || saveState === "deleting"}
            className="rounded-full border border-destructive/20 bg-destructive/6 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            Delete
          </button>
        )}

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
          disabled={
            !text.trim() ||
            saveState === "saving" ||
            saveState === "saved" ||
            saveState === "deleting"
          }
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
