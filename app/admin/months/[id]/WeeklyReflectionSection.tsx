"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContentItem } from "@/lib/queries/get-admin-month-detail";

/**
 * WeeklyReflectionSection — shows all week slots for a month.
 * Each week slot is either:
 *   - Filled → shows title, status, edit link
 *   - Empty  → shows "+ Add reflection" button that expands an inline form
 */

export type WeekSlot = {
  weekNumber: number;
  weekStart: string; // YYYY-MM-DD (Monday)
  weekLabel: string; // "Apr 7"
  content: ContentItem | null;
};

interface Props {
  monthId: string;
  monthYear: string;
  weekSlots: WeekSlot[];
  action: (formData: FormData) => Promise<void>;
}

const STATUS_BADGE: Record<string, string> = {
  published: "admin-badge admin-badge--published",
  draft: "admin-badge admin-badge--draft",
  ready_for_review: "admin-badge admin-badge--review",
};

const STATUS_LABEL: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  ready_for_review: "Review",
};

export function WeeklyReflectionSection({
  monthId,
  monthYear,
  weekSlots,
  action,
}: Props) {
  return (
    <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
      <div className="admin-section__header">
        <span className="admin-section__title">📝 Weekly Reflections</span>
        <span
          style={{
            fontSize: "0.6875rem",
            color: "var(--color-muted-fg)",
          }}
        >
          {weekSlots.filter((w) => w.content).length}/{weekSlots.length} filled
        </span>
      </div>
      <div className="admin-section__body" style={{ padding: 0 }}>
        {weekSlots.map((slot) => (
          <WeekSlotRow
            key={slot.weekStart}
            slot={slot}
            monthId={monthId}
            monthYear={monthYear}
            action={action}
          />
        ))}
      </div>
    </div>
  );
}

function WeekSlotRow({
  slot,
  monthId,
  monthYear,
  action,
}: {
  slot: WeekSlot;
  monthId: string;
  monthYear: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);

  if (slot.content) {
    // Filled state: compact row
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid var(--color-border)",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: "0.6875rem",
              color: "var(--color-muted-fg)",
              fontVariantNumeric: "tabular-nums",
              minWidth: "6rem",
              flexShrink: 0,
            }}
          >
            Wk {slot.weekNumber} · {slot.weekLabel}
          </span>
          <Link
            href={`/admin/content/${slot.content.id}/edit`}
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--color-foreground)",
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {slot.content.title}
          </Link>
        </div>
        <span className={STATUS_BADGE[slot.content.status] ?? STATUS_BADGE.draft}>
          {STATUS_LABEL[slot.content.status] ?? slot.content.status}
        </span>
      </div>
    );
  }

  // Empty state: add button + expandable form
  return (
    <div
      style={{
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1.25rem",
          gap: "0.75rem",
        }}
      >
        <span
          style={{
            fontSize: "0.6875rem",
            color: "var(--color-muted-fg)",
            fontVariantNumeric: "tabular-nums",
            minWidth: "6rem",
          }}
        >
          Wk {slot.weekNumber} · {slot.weekLabel}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            font: "inherit",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--color-primary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {expanded ? "Cancel" : "+ Add reflection"}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0 1.25rem 1rem" }}>
          <form action={action}>
            <input type="hidden" name="month_id" value={monthId} />
            <input type="hidden" name="month_year" value={monthYear} />
            <input type="hidden" name="week_start" value={slot.weekStart} />

            <div className="admin-form-field">
              <label className="admin-label">
                Title <span className="admin-label__required">*</span>
              </label>
              <input
                name="title"
                type="text"
                required
                placeholder={`Week ${slot.weekNumber} Reflection`}
                className="admin-input"
              />
            </div>

            <div className="admin-form-field">
              <label className="admin-label">Excerpt</label>
              <input
                name="excerpt"
                type="text"
                placeholder="Short description for the Today card"
                className="admin-input"
              />
            </div>

            <div className="admin-form-field">
              <label className="admin-label">Body / principle text</label>
              <textarea
                name="body"
                rows={3}
                placeholder="The weekly principle or reflection content…"
                className="admin-textarea admin-textarea--no-resize"
              />
            </div>

            <div className="admin-form-field">
              <label className="admin-label">Reflection prompt</label>
              <input
                name="reflection_prompt"
                type="text"
                placeholder="What does this principle mean in your life?"
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

            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              style={{ marginTop: "0.5rem" }}
            >
              Create Reflection
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
