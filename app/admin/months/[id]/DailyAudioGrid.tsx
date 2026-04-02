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
}

export function DailyAudioGrid({
  monthId,
  monthYear,
  dailySlots,
  unassigned,
}: Props) {
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
    <div className="bg-card border border-border rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm text-foreground">
            Daily Audio Grid
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag filled slots to reorder
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {filledSlots}/{totalSlots} filled ({fillPct}%)
        </span>
      </div>

      {/* Fill progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${fillPct}%` }}
        />
      </div>

      {/* Saving indicator */}
      {isPending && (
        <p className="text-xs text-muted-foreground text-center py-1.5 bg-muted/50 rounded mb-3">
          Saving…
        </p>
      )}

      {/* Calendar grid */}
      <div
        className={`grid grid-cols-7 gap-1.5 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
      >
        {/* Weekday headers */}
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] text-muted-foreground font-medium py-1"
          >
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

          return (
            <div
              key={slot.date}
              onDragOver={(e) => handleDragOver(e, slot.date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) =>
                handleDrop(e, slot.date, slot.content?.id ?? null)
              }
              className={[
                "relative rounded-md border text-center p-1.5 min-h-[60px] flex flex-col items-center justify-between transition-all duration-150",
                isDragTarget
                  ? "border-primary ring-1 ring-primary bg-primary/5 scale-[1.04]"
                  : filled
                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10"
                    : "border-border bg-muted/30 hover:bg-muted/60",
                isBeingDragged ? "opacity-40" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="text-[11px] text-muted-foreground tabular-nums font-medium">
                {slot.dayOfMonth}
              </span>

              {filled ? (
                /* Draggable content block */
                <div
                  className="w-full mt-1 cursor-grab active:cursor-grabbing select-none"
                  draggable
                  onDragStart={(e) =>
                    handleDragStart(e, slot.date, slot.content!.id)
                  }
                  onDragEnd={handleDragEnd}
                >
                  <Link
                    href={`/admin/content/${slot.content!.id}/edit`}
                    className="text-[9px] text-foreground hover:text-primary transition-colors leading-tight line-clamp-2 block"
                    title={slot.content!.title}
                    draggable={false}
                  >
                    {slot.content!.title}
                  </Link>
                  <div className="flex items-center justify-center gap-1 mt-0.5 text-[9px] text-muted-foreground">
                    <span>🎧{slot.content!.listens}</span>
                    <span>📝{slot.content!.notes}</span>
                  </div>
                  <form action={unassignDailyAudio} className="mt-0.5">
                    <input
                      type="hidden"
                      name="content_id"
                      value={slot.content!.id}
                    />
                    <input type="hidden" name="month_id" value={monthId} />
                    <button
                      type="submit"
                      className="text-[9px] text-destructive/60 hover:text-destructive transition-colors"
                      title="Remove from this date"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              ) : (
                /* Empty slot — show assign picker */
                <div className="w-full mt-1">
                  {unassigned.length > 0 ? (
                    <form
                      action={assignDailyAudio}
                      className="flex flex-col items-center gap-0.5"
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
                        className="w-full text-[9px] bg-transparent border-none text-muted-foreground cursor-pointer text-center"
                        defaultValue=""
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
                        className="text-[9px] text-primary hover:text-primary-hover transition-colors font-medium"
                      >
                        + Assign
                      </button>
                    </form>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">—</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
