"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContentItem } from "@/lib/queries/get-admin-month-detail";
import { usePersistentSectionState } from "./usePersistentSectionState";

/**
 * WeeklyReflectionSection - shows all week slots for a month.
 * Each week slot is either:
 *   - Filled: shows title, status, edit link
 *   - Empty: shows an add button that expands an inline form
 */

export type WeekSlot = {
  weekNumber: number;
  weekStart: string; // YYYY-MM-DD (Monday)
  weekLabel: string; // "Apr 7"
  content: ContentItem | null;
};

interface Props {
  action: (formData: FormData) => Promise<void>;
  bulkAction: (formData: FormData) => Promise<void>;
  monthId: string;
  monthYear: string;
  weekSlots: WeekSlot[];
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
  action,
  bulkAction,
  monthId,
  monthYear,
  weekSlots,
}: Props) {
  const filledCount = weekSlots.filter((w) => w.content).length;
  const missingSlots = weekSlots.filter((w) => !w.content);
  const [expanded, setExpanded] = usePersistentSectionState(
    `admin:month:${monthId}:weekly`,
    true
  );

  return (
    <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
      <button
        type="button"
        className="admin-section__header admin-section__header-button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <span>
          <span className="admin-section__title">Weekly principles</span>
          <span className="admin-section__subtitle">
            Add one clear focus for each week in the month.
          </span>
        </span>
        <span className="admin-section__header-meta">
          <span className="admin-section__count">
            {filledCount}/{weekSlots.length}
          </span>
          <span className="admin-section__toggle">{expanded ? "Hide" : "Show"}</span>
        </span>
      </button>
      {expanded ? (
        <>
          {missingSlots.length > 0 ? (
            <div className="admin-week-bulk">
              <div>
                <p className="admin-week-bulk__title">
                  {missingSlots.length} week{missingSlots.length === 1 ? "" : "s"} still need a draft.
                </p>
                <p className="admin-week-bulk__copy">
                  Create placeholders now, then edit each title and reflection when ready.
                </p>
              </div>
              <form action={bulkAction}>
                <input type="hidden" name="month_id" value={monthId} />
                <input type="hidden" name="month_year" value={monthYear} />
                {missingSlots.map((slot) => (
                  <input key={slot.weekStart} type="hidden" name="week_start" value={slot.weekStart} />
                ))}
                <button type="submit" className="admin-btn admin-btn--outline">
                  Create missing drafts
                </button>
              </form>
            </div>
          ) : null}
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
        </>
      ) : null}
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
          <span className="admin-week-row__badge">
            <strong>Week {slot.weekNumber}</strong>
            <span>{slot.weekLabel}</span>
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
        <span className="admin-week-row__badge">
          <strong>Week {slot.weekNumber}</strong>
          <span>{slot.weekLabel}</span>
        </span>
        <span className="admin-week-row__empty-label">
          Add the principle members will return to this week.
        </span>
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

            <div className="admin-form-grid-2">
              <div className="admin-form-field">
                <label className="admin-label">
                  Title <span className="admin-label__required">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder={`Week ${slot.weekNumber} principle`}
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

            <div className="admin-form-grid-2">
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
