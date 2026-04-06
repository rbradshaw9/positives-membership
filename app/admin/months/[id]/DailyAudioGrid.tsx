"use client";

import Link from "next/link";
import { useTransition, useState, useRef } from "react";
import type { DailySlot } from "@/lib/queries/get-admin-month-detail";
import {
  swapDailyAudios,
  assignDailyAudio,
  unassignDailyAudio,
} from "../actions";

/**
 * app/admin/months/[id]/DailyAudioGrid.tsx
 * Interactive calendar grid for daily audio slot management.
 *
 * - Drag any filled slot onto another slot to swap / move their publish_date.
 * - Assign picker still appears on empty slots.
 * - Uses startTransition + swapDailyAudios (which calls refresh()) so the
 *   grid re-renders in place without a full page navigation.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface Props {
  monthId: string;
  monthYear: string;
  dailySlots: DailySlot[];
  unassigned: { id: string; title: string; created_at: string }[];
  quickCreateAction?: (formData: FormData) => Promise<void>;
}

export function DailyAudioGrid({
  monthId,
  monthYear,
  dailySlots,
  unassigned,
  quickCreateAction,
}: Props) {
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draggingDate, setDraggingDate] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  // Use a ref so the drag data survives across synthetic event teardown
  const dragDataRef = useRef<{ date: string; contentId: string } | null>(null);

  const filledSlots = dailySlots.filter((s) => s.content !== null).length;
  const totalSlots = dailySlots.length;
  const fillPct =
    totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
  const dayOffset = dailySlots[0]
    ? WEEKDAYS.indexOf(dailySlots[0].weekday as (typeof WEEKDAYS)[number])
    : 0;

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(
    e: React.DragEvent,
    date: string,
    contentId: string
  ) {
    dragDataRef.current = { date, contentId };
    setDraggingDate(date);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", date); // required for Firefox
  }

  function handleDragEnd() {
    setDraggingDate(null);
    setDragOverDate(null);
  }

  function handleDragOver(e: React.DragEvent, date: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDate !== date) setDragOverDate(date);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear the target highlight when leaving the cell entirely,
    // not when moving between its children.
    if (
      !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)
    ) {
      setDragOverDate(null);
    }
  }

  function handleDrop(
    e: React.DragEvent,
    targetDate: string,
    targetContentId: string | null
  ) {
    e.preventDefault();
    setDragOverDate(null);

    const source = dragDataRef.current;
    dragDataRef.current = null;
    setDraggingDate(null);

    if (!source || source.date === targetDate) return;

    const fd = new FormData();
    fd.append("source_content_id", source.contentId);
    fd.append("source_date", source.date);
    fd.append("target_date", targetDate);
    fd.append("month_id", monthId);
    if (targetContentId) fd.append("target_content_id", targetContentId);

    startTransition(async () => {
      await swapDailyAudios(fd);
      // swapDailyAudios calls refresh() internally — no client redirect needed
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="admin-section">
      {/* Header */}
      <div className="admin-section__header">
        <div>
          <span className="admin-section__title">Daily Audio Grid</span>
          <p className="admin-hint" style={{ marginTop: "0.125rem" }}>
            Drag filled slots to reorder
          </p>
        </div>
        <span className="admin-hint" style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {filledSlots}/{totalSlots} filled ({fillPct}%)
        </span>
      </div>

      <div className="admin-section__body">
        {/* Fill progress bar */}
        <div className="admin-cal-progress">
          <div
            className="admin-cal-progress__bar"
            style={{ width: `${fillPct}%` }}
          />
        </div>

        {/* Saving indicator */}
        {isPending && (
          <p className="admin-cal-saving">Saving…</p>
        )}

        {/* Calendar grid */}
        <div
          className="admin-cal-grid"
          style={{
            opacity: isPending ? 0.6 : 1,
            pointerEvents: isPending ? "none" : undefined,
          }}
        >
          {/* Weekday headers */}
          {WEEKDAYS.map((d) => (
            <div key={d} className="admin-cal-weekday">
              {d}
            </div>
          ))}

          {/* Leading empty cells for the first day's weekday offset */}
          {Array.from({ length: dayOffset }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {dailySlots.map((slot) => {
            const filled = slot.content !== null;
            const isBeingDragged = draggingDate === slot.date;
            const isDragTarget =
              dragOverDate === slot.date &&
              draggingDate !== null &&
              draggingDate !== slot.date;

            let cellBg: string;
            let cellBorder: string;
            let cellTransform = "none";
            let cellBoxShadow = "none";

            if (isDragTarget) {
              cellBg = "rgba(46,196,182,0.06)";
              cellBorder = "var(--color-primary)";
              cellTransform = "scale(1.04)";
              cellBoxShadow = "0 0 0 2px rgba(46,196,182,0.25)";
            } else if (filled) {
              cellBg = "rgba(34,197,94,0.05)";
              cellBorder = "rgba(34,197,94,0.28)";
            } else {
              cellBg = "color-mix(in srgb, var(--color-muted) 50%, white)";
              cellBorder = "var(--color-border)";
            }

            return (
              <div
                key={slot.date}
                onDragOver={(e) => handleDragOver(e, slot.date)}
                onDragLeave={handleDragLeave}
                onDrop={(e) =>
                  handleDrop(e, slot.date, slot.content?.id ?? null)
                }
                style={{
                  position: "relative",
                  borderRadius: "0.5rem",
                  border: `1px solid ${cellBorder}`,
                  textAlign: "center",
                  padding: "0.375rem",
                  minHeight: "3.75rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  background: cellBg,
                  transform: cellTransform,
                  boxShadow: cellBoxShadow,
                  opacity: isBeingDragged ? 0.35 : 1,
                  transition: "transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease, background 150ms ease",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-muted-fg)",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {slot.dayOfMonth}
                </span>

                {filled ? (
                  /* Draggable content block */
                  <div
                    style={{
                      width: "100%",
                      marginTop: "0.25rem",
                      cursor: "grab",
                      userSelect: "none",
                    }}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, slot.date, slot.content!.id)
                    }
                    onDragEnd={handleDragEnd}
                  >
                    <Link
                      href={`/admin/content/${slot.content!.id}/edit`}
                      style={{
                        fontSize: "0.5625rem",
                        color: "var(--color-foreground)",
                        textDecoration: "none",
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        transition: "color 120ms ease",
                      }}
                      title={slot.content!.title}
                      draggable={false}
                    >
                      {slot.content!.title}
                    </Link>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.25rem",
                        marginTop: "0.125rem",
                        fontSize: "0.5625rem",
                        color: "var(--color-muted-fg)",
                      }}
                    >
                      <span>🎧{slot.content!.listens}</span>
                      <span>📝{slot.content!.notes}</span>
                    </div>
                    <form action={unassignDailyAudio} style={{ marginTop: "0.125rem" }}>
                      <input
                        type="hidden"
                        name="content_id"
                        value={slot.content!.id}
                      />
                      <input type="hidden" name="month_id" value={monthId} />
                      <button
                        type="submit"
                        style={{
                          fontSize: "0.5625rem",
                          color: "rgba(239,68,68,0.5)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          transition: "color 120ms ease",
                        }}
                        title="Remove from this date"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Empty slot — show assign picker */
                  <div style={{ width: "100%", marginTop: "0.25rem" }}>
                    {unassigned.length > 0 ? (
                      <form
                        action={assignDailyAudio}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.125rem" }}
                      >
                        <input type="hidden" name="month_id" value={monthId} />
                        <input
                          type="hidden"
                          name="publish_date"
                          value={slot.date}
                        />
                        <input
                          type="hidden"
                          name="month_year"
                          value={monthYear}
                        />
                        <select
                          name="content_id"
                          required
                          defaultValue=""
                          style={{
                            width: "100%",
                            fontSize: "0.5625rem",
                            background: "transparent",
                            border: "none",
                            color: "var(--color-muted-fg)",
                            cursor: "pointer",
                            textAlign: "center",
                          }}
                        >
                          <option value="" disabled>
                            pick…
                          </option>
                          {unassigned.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.title.length > 28
                                ? a.title.slice(0, 28) + "…"
                                : a.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          style={{
                            fontSize: "0.5625rem",
                            color: "var(--color-primary)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            fontWeight: 600,
                            transition: "color 120ms ease",
                          }}
                        >
                          + Assign
                        </button>
                      </form>
                    ) : (
                      <span style={{ fontSize: "0.5625rem", color: "var(--color-muted-fg)" }}>—</span>
                    )}
                    {quickCreateAction && (
                      <button
                        type="button"
                        onClick={() => setQuickAddDate(quickAddDate === slot.date ? null : slot.date)}
                        style={{
                          fontSize: "0.5625rem",
                          color: "var(--color-primary)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          fontWeight: 600,
                          marginTop: "0.125rem",
                        }}
                      >
                        + New
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick add inline form */}
      {quickAddDate && quickCreateAction && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.625rem",
            border: "1px solid var(--color-primary)",
            background: "rgba(46,196,182,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "var(--color-foreground)",
              }}
            >
              New Daily Audio —{" "}
              {new Date(quickAddDate + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
            <button
              type="button"
              onClick={() => setQuickAddDate(null)}
              style={{
                fontSize: "0.75rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-muted-fg)",
              }}
            >
              ✕ Close
            </button>
          </div>
          <form action={quickCreateAction}>
            <input type="hidden" name="month_id" value={monthId} />
            <input type="hidden" name="month_year" value={monthYear} />
            <input type="hidden" name="publish_date" value={quickAddDate} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-label">
                  Title <span className="admin-label__required">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Daily Practice Title"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Audio URL (Castos / direct MP3)</label>
                <input
                  name="castos_episode_url"
                  type="url"
                  placeholder="https://…"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">S3 Key / Google Drive ID</label>
                <input
                  name="s3_audio_key"
                  type="text"
                  placeholder="audio/2026/04/practice-01.mp3"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Duration (seconds)</label>
                <input
                  name="duration_seconds"
                  type="number"
                  placeholder="600"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Status</label>
                <select name="status" defaultValue="draft" className="admin-select">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              style={{ marginTop: "0.75rem" }}
            >
              Create Daily Audio
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
