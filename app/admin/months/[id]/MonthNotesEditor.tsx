"use client";

import { usePersistentSectionState } from "./usePersistentSectionState";

type MonthNotesEditorProps = {
  action: (formData: FormData) => Promise<void>;
  adminNotes: string | null;
  description: string | null;
  monthId: string;
};

export function MonthNotesEditor({
  action,
  adminNotes,
  description,
  monthId,
}: MonthNotesEditorProps) {
  const [expanded, setExpanded] = usePersistentSectionState(
    `admin:month:${monthId}:notes`,
    false
  );

  return (
    <div id="month-notes" className="admin-section admin-anchor-section" style={{ marginBottom: "1.5rem" }}>
      <button
        type="button"
        className="admin-section__header admin-section__header-button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <span>
          <span className="admin-section__title">Month notes</span>
          <span className="admin-section__subtitle">Optional context for the month record and internal planning.</span>
        </span>
        <span className="admin-section__header-meta">
          <span className="admin-section__toggle">{expanded ? "Hide" : "Edit"}</span>
        </span>
      </button>

      {expanded ? (
        <div className="admin-section__body">
          <form action={action} className="admin-flow-form">
            <input type="hidden" name="id" value={monthId} />
            <div className="admin-form-grid-2">
              <div className="admin-form-field">
                <label className="admin-form-section__label">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={description ?? ""}
                  placeholder="Month description (optional)..."
                  className="admin-textarea admin-textarea--no-resize"
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-section__label">Admin notes</label>
                <textarea
                  name="admin_notes"
                  rows={3}
                  defaultValue={adminNotes ?? ""}
                  placeholder="Internal notes..."
                  className="admin-textarea admin-textarea--no-resize"
                />
              </div>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary">
              Save notes
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
