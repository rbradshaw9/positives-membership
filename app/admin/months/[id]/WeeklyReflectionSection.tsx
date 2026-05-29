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
        <div>
          <span className="admin-section__title">Weekly principles</span>
          <p className="admin-section__subtitle">Add one clear focus for each week in the month.</p>
        </div>
        <span className="admin-section__count">
          {weekSlots.filter((w) => w.content).length}/{weekSlots.length}
        </span>
      </div>
      <div className="admin-week-list">
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
    return (
      <div className="admin-week-row">
        <div className="admin-week-row__main">
          <span className="admin-week-row__date">
            Wk {slot.weekNumber} · {slot.weekLabel}
          </span>
          <Link
            href={`/admin/months/${monthId}/content/${slot.content.id}/edit`}
            className="admin-week-row__title"
          >
            {slot.content.title}
          </Link>
        </div>
        <div className="admin-week-row__actions">
          <span className={STATUS_BADGE[slot.content.status] ?? STATUS_BADGE.draft}>
            {STATUS_LABEL[slot.content.status] ?? slot.content.status}
          </span>
          <Link href={`/admin/months/${monthId}/content/${slot.content.id}/edit`} className="admin-link-button">
            Edit
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-week-row admin-week-row--empty">
      <div className="admin-week-row__main">
        <span className="admin-week-row__date">
          Wk {slot.weekNumber} · {slot.weekLabel}
        </span>
        <span className="admin-week-row__empty-label">No weekly principle yet</span>
      </div>
      <div className="admin-week-row__actions">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="admin-link-button"
        >
          {expanded ? "Cancel" : "Add"}
        </button>
      </div>

      {expanded && (
        <div className="admin-week-row__form">
          <form action={action} className="admin-flow-form">
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
            >
              Create weekly principle
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
