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

function formatMonthDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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
          <span className="admin-section__title">Daily audio</span>
          <p className="admin-section__subtitle">
            Upload in bulk, assign open days, or drag filled days to reorder.
          </p>
        </div>
        <span className="admin-section__count">
          {filledSlots}/{totalSlots}
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

            const cellClass = [
              "admin-cal-day",
              filled ? "admin-cal-day--filled" : "admin-cal-day--empty",
              isBeingDragged ? "is-dragging" : "",
              isDragTarget ? "is-drop-target" : "",
            ].filter(Boolean).join(" ");

            return (
              <div
                key={slot.date}
                onDragOver={(e) => handleDragOver(e, slot.date)}
                onDragLeave={handleDragLeave}
                onDrop={(e) =>
                  handleDrop(e, slot.date, slot.content?.id ?? null)
                }
                className={cellClass}
              >
                <span className="admin-cal-day__number">
                  {slot.dayOfMonth}
                </span>

                {filled ? (
                  <div
                    className="admin-cal-day__content"
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, slot.date, slot.content!.id)
                    }
                    onDragEnd={handleDragEnd}
                  >
                    <Link
                      href={`/admin/months/${monthId}/content/${slot.content!.id}/edit`}
                      className="admin-cal-day__title"
                      title={slot.content!.title}
                      draggable={false}
                    >
                      {slot.content!.title}
                    </Link>
                    <div className="admin-cal-day__meta">
                      <span>{slot.content!.listens} plays</span>
                      <span>{slot.content!.notes} notes</span>
                    </div>
                    <form action={unassignDailyAudio}>
                      <input
                        type="hidden"
                        name="content_id"
                        value={slot.content!.id}
                      />
                      <input type="hidden" name="month_id" value={monthId} />
                      <button
                        type="submit"
                        className="admin-cal-day__remove"
                        title="Remove from this date"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="admin-cal-day__empty">
                    {unassigned.length > 0 ? (
                      <form
                        action={assignDailyAudio}
                        className="admin-cal-day__assign"
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
                          className="admin-cal-day__select"
                        >
                          <option value="" disabled>
                            Choose audio
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
                          className="admin-cal-day__action"
                      >
                        Assign
                      </button>
                      </form>
                    ) : (
                      <span className="admin-cal-day__empty-label">Open</span>
                    )}
                    {quickCreateAction && (
                      <button
                        type="button"
                        onClick={() => setQuickAddDate(quickAddDate === slot.date ? null : slot.date)}
                        className="admin-cal-day__action"
                      >
                        New
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
        <div className="admin-quick-audio">
          <div className="admin-quick-audio__header">
            <p>
              New daily audio - {formatMonthDay(quickAddDate)}
            </p>
            <button
              type="button"
              onClick={() => setQuickAddDate(null)}
              className="admin-link-button"
            >
              Close
            </button>
          </div>
          <form action={quickCreateAction} className="admin-flow-form">
            <input type="hidden" name="month_id" value={monthId} />
            <input type="hidden" name="month_year" value={monthYear} />
            <input type="hidden" name="publish_date" value={quickAddDate} />

            <div className="admin-form-grid-2">
              <div className="admin-form-field admin-form-field--full">
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
            >
              Create daily audio
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
