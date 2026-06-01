"use client";

import Link from "next/link";
import type { ContentItem } from "@/lib/queries/get-admin-month-detail";
import { ContentImagePicker } from "@/components/admin/ContentImagePicker";
import { usePersistentSectionState } from "./usePersistentSectionState";

/**
 * MonthlyMasterclassEditor - inline create/edit for the monthly_theme.
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
  archived: "admin-badge admin-badge--archived",
};

const STATUS_LABEL: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  ready_for_review: "Review",
  archived: "Archived",
};

function reconstructMediaUrl(existing: ContentItem | null) {
  if (!existing) return "";
  if (existing.vimeo_video_id) return `https://vimeo.com/${existing.vimeo_video_id}`;
  if (existing.youtube_video_id) return `https://youtube.com/watch?v=${existing.youtube_video_id}`;
  return "";
}

export function MonthlyMasterclassEditor({
  monthId,
  monthYear,
  existing,
  action,
}: Props) {
  const [expanded, setExpanded] = usePersistentSectionState(
    `admin:month:${monthId}:theme`,
    !existing
  );

  return (
    <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
      <button
        type="button"
        className="admin-section__header admin-section__header-button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span>
          <span className="admin-section__title">Monthly theme</span>
          <span className="admin-section__subtitle">
            {existing?.title ?? "Create the member-facing theme, artwork, and reflection prompt."}
          </span>
        </span>
        <span className="admin-section__header-meta">
          {existing && (
            <span className={STATUS_BADGE[existing.status] ?? STATUS_BADGE.draft}>
              {STATUS_LABEL[existing.status] ?? existing.status}
            </span>
          )}
          <span className="admin-section__toggle">{expanded ? "Hide" : existing ? "Edit" : "Create"}</span>
        </span>
      </button>

      {expanded && (
        <div className="admin-section__body">
          <form action={action} className="admin-flow-form">
            <input type="hidden" name="month_id" value={monthId} />
            <input type="hidden" name="month_year" value={monthYear} />
            {existing && (
              <input type="hidden" name="content_id" value={existing.id} />
            )}

            <section className="admin-form-group">
              <div className="admin-form-group__header">
                <h3>Basics</h3>
                <p>Name the theme and give members one clear reason it matters this month.</p>
              </div>
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
                  placeholder="Monthly theme title"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-grid-2">
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
                  <label htmlFor="mc-reflection" className="admin-label">
                    Reflection prompt
                  </label>
                  <input
                    id="mc-reflection"
                    name="reflection_prompt"
                    type="text"
                    defaultValue={existing?.reflection_prompt ?? ""}
                    placeholder="How does this theme connect to your daily practice?"
                    className="admin-input"
                  />
                </div>
              </div>
            </section>

            <section className="admin-form-group">
              <div className="admin-form-group__header">
                <h3>Artwork</h3>
                <p>Add a featured image and optional poster for cards or video surfaces.</p>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-field">
                  <ContentImagePicker
                    name="featured_image_url"
                    label="Featured image"
                    defaultValue={existing?.featured_image_url}
                    placeholder="Used as the larger monthly theme artwork."
                    recommendation="Recommended: 1920 x 1080 px, 16:9. Minimum: 1280 x 720 px."
                  />
                </div>
                <div className="admin-form-field">
                  <ContentImagePicker
                    name="thumbnail_image_url"
                    label="Thumbnail / poster"
                    defaultValue={existing?.thumbnail_image_url}
                    placeholder="Used as a compact card or video poster."
                    recommendation="Recommended: 1280 x 720 px, 16:9. Keep key text or faces centered."
                    selectedVariant="poster"
                  />
                </div>
              </div>
            </section>

            <section className="admin-form-group">
              <div className="admin-form-group__header">
                <h3>Content</h3>
                <p>
                  Use transcripts, call notes, or research only as source material. Paste polished
                  member-facing copy here, not Zoom links, source docs, or internal notes.
                </p>
              </div>
              <div className="admin-form-field">
                <label htmlFor="mc-description" className="admin-label">
                  Description
                </label>
                <textarea
                  id="mc-description"
                  name="description"
                  rows={3}
                  defaultValue={existing?.description ?? ""}
                  placeholder="Longer description of this month's theme…"
                  className="admin-textarea admin-textarea--no-resize"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="mc-body" className="admin-label">
                  Body / supporting notes
                </label>
                <textarea
                  id="mc-body"
                  name="body"
                  rows={5}
                  defaultValue={existing?.body ?? ""}
                  placeholder="Supporting notes for the monthly theme…"
                  className="admin-textarea admin-textarea--no-resize"
                />
              </div>
            </section>

            <section className="admin-form-group">
              <div className="admin-form-group__header">
                <h3>Media and status</h3>
                <p>Attach legacy video links here, then choose whether members can see the theme.</p>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-field">
                  <label htmlFor="mc-media" className="admin-label">
                    Video URL
                  </label>
                  <input
                    id="mc-media"
                    name="media_url"
                    type="url"
                    defaultValue={reconstructMediaUrl(existing)}
                    placeholder="Paste a Vimeo or YouTube URL..."
                    className="admin-input"
                  />
                  <p className="admin-hint">
                    Auto-detected: Vimeo or YouTube. For a new Mux upload, save the theme first,
                    then open the full editor.
                  </p>
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
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="admin-form-actions" style={{ marginTop: "0.75rem" }}>
              <button type="submit" className="admin-btn admin-btn--primary">
                {existing ? "Save monthly theme" : "Create monthly theme"}
              </button>
              {existing ? (
                <Link
                  href={`/admin/months/${monthId}/content/${existing.id}/edit`}
                  className="admin-btn admin-btn--outline"
                >
                  Open full editor
                </Link>
              ) : null}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
