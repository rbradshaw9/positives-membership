"use client";

import { useState } from "react";
import type { ContentItem } from "@/lib/queries/get-admin-month-detail";

/**
 * MonthlyMasterclassEditor — inline create/edit for the monthly_theme.
 * If an existing item is passed, shows populated fields + Save.
 * If none, shows empty fields + Create.
 */

interface Props {
  monthId: string;
  monthYear: string;
  existing: ContentItem | null;
  action: (formData: FormData) => Promise<void>;
}

const STATUS_BADGE: Record<string, string> = {
  published: "admin-badge admin-badge--published",
  draft: "admin-badge admin-badge--draft",
  ready_for_review: "admin-badge admin-badge--review",
};

export function MonthlyMasterclassEditor({
  monthId,
  monthYear,
  existing,
  action,
}: Props) {
  const [expanded, setExpanded] = useState(!existing);

  return (
    <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
      <div
        className="admin-section__header"
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="admin-section__title">
          📹 Monthly Masterclass
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {existing && (
            <span className={STATUS_BADGE[existing.status] ?? STATUS_BADGE.draft}>
              {existing.status === "published" ? "Published" : existing.status === "draft" ? "Draft" : "Review"}
            </span>
          )}
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-muted-fg)",
              transition: "transform 200ms ease",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              display: "inline-block",
            }}
          >
            ▼
          </span>
        </span>
      </div>

      {expanded && (
        <div className="admin-section__body">
          <form action={action}>
            <input type="hidden" name="month_id" value={monthId} />
            <input type="hidden" name="month_year" value={monthYear} />
            {existing && (
              <input type="hidden" name="content_id" value={existing.id} />
            )}

            <div className="admin-form-field">
              <label htmlFor="mc-title" className="admin-label">
                Title <span className="admin-label__required">*</span>
              </label>
              <input
                id="mc-title"
                name="title"
                type="text"
                required
                defaultValue={existing?.title ?? ""}
                placeholder="Monthly Masterclass Title"
                className="admin-input"
              />
            </div>

            <div className="admin-form-field">
              <label htmlFor="mc-excerpt" className="admin-label">
                Excerpt
              </label>
              <input
                id="mc-excerpt"
                name="excerpt"
                type="text"
                defaultValue={existing?.excerpt ?? ""}
                placeholder="Short pull-quote shown on the Today card"
                className="admin-input"
              />
            </div>

            <div className="admin-form-field">
              <label htmlFor="mc-description" className="admin-label">
                Description
              </label>
              <textarea
                id="mc-description"
                name="description"
                rows={3}
                defaultValue={""}
                placeholder="Longer description of this month's theme…"
                className="admin-textarea admin-textarea--no-resize"
              />
            </div>

            <div className="admin-form-field">
              <label htmlFor="mc-media" className="admin-label">
                Video URL
              </label>
              <input
                id="mc-media"
                name="media_url"
                type="url"
                defaultValue={""}
                placeholder="Paste a Vimeo or YouTube URL…"
                className="admin-input"
              />
              <p className="admin-hint">Auto-detected: Vimeo or YouTube</p>
            </div>

            <div className="admin-form-field">
              <label htmlFor="mc-reflection" className="admin-label">
                Reflection prompt
              </label>
              <input
                id="mc-reflection"
                name="reflection_prompt"
                type="text"
                defaultValue={""}
                placeholder="How does this theme connect to your daily practice?"
                className="admin-input"
              />
            </div>

            <div className="admin-form-field">
              <label htmlFor="mc-status" className="admin-label">
                Status
              </label>
              <select
                id="mc-status"
                name="status"
                defaultValue={existing?.status ?? "draft"}
                className="admin-select"
              >
                <option value="draft">Draft</option>
                <option value="ready_for_review">Ready for review</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="admin-form-actions" style={{ marginTop: "0.75rem" }}>
              <button type="submit" className="admin-btn admin-btn--primary">
                {existing ? "Save Masterclass" : "Create Masterclass"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
