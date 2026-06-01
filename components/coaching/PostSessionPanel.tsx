"use client";

/**
 * components/coaching/PostSessionPanel.tsx
 *
 * Shown after a confirmed session's scheduled time has passed.
 *
 * Coach sees: notes textarea → POST /api/coaching/session/[id]/complete { coachNotes }
 * Member sees: optional reflection → POST /api/coaching/session/[id]/complete { memberReflection }
 *
 * After submission, renders a "thank you" state and calls onComplete().
 */

import { useState } from "react";

type Props = {
  bookingId: string;
  role: "coach" | "member";
  coachName?: string;
  memberName?: string | null;
  onComplete?: () => void;
};

export function PostSessionPanel({
  bookingId,
  role,
  coachName,
  memberName,
  onComplete,
}: Props) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body =
        role === "coach"
          ? { coachNotes: notes.trim() || undefined }
          : { memberReflection: notes.trim() || undefined };

      const res = await fetch(`/api/coaching/session/${bookingId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to save. Try again.");
        setSaving(false);
        return;
      }
      setSaved(true);
      onComplete?.();
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div
        className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col items-center gap-3 text-center"
        role="status"
        aria-live="polite"
      >
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-primary)" }}
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-foreground">
          {role === "coach" ? "Session notes saved." : "Reflection saved — great session!"}
        </p>
        {role === "member" && (
          <p className="text-xs text-muted-foreground max-w-xs">
            Your coach may share a follow-up after reviewing your session.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-primary)/15", border: "1px solid var(--color-primary)/20" }}
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {role === "coach"
              ? `Session complete${memberName ? ` — ${memberName}` : ""}`
              : "Session complete!"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {role === "coach"
              ? "Add session notes below. Your member won't see these."
              : `Great work${coachName ? ` with ${coachName}` : ""}. Share a quick reflection?`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="post-session-notes" className="block text-xs font-medium text-muted-foreground mb-1.5">
            {role === "coach" ? "Session notes" : "Your reflection"}{" "}
            <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <textarea
            id="post-session-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              role === "coach"
                ? "Topics covered, next steps, follow-up items…"
                : "What did you take away from this session?"
            }
            rows={3}
            className="w-full rounded-lg border border-border bg-surface-tint/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none sm:rows-4"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            {saving ? "Saving…" : role === "coach" ? "Save notes" : "Save reflection"}
          </button>
          <button
            type="button"
            onClick={() => {
              // Skip without saving — still mark complete (non-fatal)
              fetch(`/api/coaching/session/${bookingId}/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              })
                .then((res) => {
                  if (!res.ok) {
                    console.warn("[PostSessionPanel] Skip complete returned", res.status);
                  }
                  setSaved(true);
                  onComplete?.();
                })
                .catch(() => {
                  // Network failure — still dismiss; session notes are optional
                  setSaved(true);
                  onComplete?.();
                });
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
