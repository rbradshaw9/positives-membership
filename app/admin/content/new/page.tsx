import Link from "next/link";
import { createContent } from "../actions";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import { ResourceLinksEditor } from "@/components/admin/ResourceLinksEditor";
import { BodyEditor } from "@/components/admin/BodyEditor";

/**
 * app/admin/content/new/page.tsx
 * Create a new content record (Daily / Weekly / Monthly / Coaching).
 * Sprint 5 — richer content fields + media URL auto-detect.
 * Sprint 10 — coaching_call type, tier_min, starts_at.
 */

export const metadata = {
  title: "New Content — Positives Admin",
};

type SearchParams = Promise<{
  error?: string;
  type?: string;
  publish_date?: string;
  week_start?: string;
  month_year?: string;
}>;

export default async function AdminContentNewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const defaultType = params.type ?? "daily_audio";
  const todayEastern = getEffectiveDate();

  return (
    <div className="max-w-2xl">
      <div className="admin-breadcrumb">
        <Link href="/admin/content" className="admin-breadcrumb__back">
          ← Back to content
        </Link>
      </div>

      <div className="admin-page-header">
        <h1 className="admin-page-header__title">New content</h1>
        <p className="admin-page-header__subtitle">
          Create a Daily, Weekly, or Monthly content record.
        </p>
      </div>

      {params.error && (
        <div className="admin-banner admin-banner--error">
          {params.error === "title_required"
            ? "Title is required."
            : "Failed to save. Check server logs."}
        </div>
      )}

      <ContentForm
        action={createContent}
        defaultType={defaultType}
        todayEastern={todayEastern}
        submitLabel="Create content"
        dateDefaults={{
          publish_date: params.publish_date,
          week_start: params.week_start,
          month_year: params.month_year,
        }}
      />
    </div>
  );
}

/* ── Shared form component ─────────────────────────────────────────────────── */

export interface ContentFormValues {
  type?: string;
  title?: string;
  excerpt?: string;
  description?: string;
  body?: string | null;
  reflection_prompt?: string | null;
  download_url?: string | null;
  resource_links?: Array<{ label: string; url: string }> | null;
  status?: string;
  publish_date?: string | null;
  week_start?: string | null;
  month_year?: string | null;
  duration_seconds?: number | null;
  castos_episode_url?: string | null;
  s3_audio_key?: string | null;
  vimeo_video_id?: string | null;
  youtube_video_id?: string | null;
  admin_notes?: string | null;
  id?: string;
  tier_min?: string | null;   // Sprint 10
  starts_at?: string | null;  // Sprint 10
  join_url?: string | null;   // Sprint 10 patch: coaching Zoom link
}

/**
 * Reconstruct the original media URL from stored DB columns.
 * Used to pre-fill the media_url field when editing existing content.
 */
function reconstructMediaUrl(values?: ContentFormValues): string {
  if (!values) return "";
  if (values.vimeo_video_id) return `https://vimeo.com/${values.vimeo_video_id}`;
  if (values.youtube_video_id) return `https://youtube.com/watch?v=${values.youtube_video_id}`;
  // For non-daily types, castos_episode_url might hold a direct audio/castos URL
  if (values.type !== "daily_audio" && values.castos_episode_url) {
    return values.castos_episode_url;
  }
  return "";
}

export function ContentForm({
  action,
  defaultType,
  todayEastern,
  submitLabel,
  values,
  dateDefaults,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultType: string;
  todayEastern: string;
  submitLabel: string;
  values?: ContentFormValues;
  dateDefaults?: {
    publish_date?: string;
    week_start?: string;
    month_year?: string;
  };
}) {
  const type = values?.type ?? defaultType;
  const isDaily = type === "daily_audio";
  const isWeekly = type === "weekly_principle";
  const isMonthly = type === "monthly_theme";
  const isCoaching = type === "coaching_call";

  // Format stored ISO string back to datetime-local input value (YYYY-MM-DDTHH:mm)
  const startsAtLocal = values?.starts_at
    ? values.starts_at.slice(0, 16)
    : "";

  return (
    <form action={action} className="admin-form-card">
      {values?.id && <input type="hidden" name="id" value={values.id} />}

      {/* ─── Core ────────────────────────────────────────────────────────── */}

      {/* Type */}
      <div className="admin-form-field">
        <label htmlFor="type" className="admin-label">
          Content type <span className="admin-label__required">*</span>
        </label>
        <select
          id="type"
          name="type"
          defaultValue={type}
          className="admin-select"
        >
          <option value="daily_audio">Daily — audio practice</option>
          <option value="weekly_principle">Weekly — principle</option>
          <option value="monthly_theme">Monthly — theme</option>
          <option value="coaching_call">Coaching call (Level 3+)</option>
        </select>
        <p className="admin-hint">Determines which Today card this appears in</p>
      </div>

      {/* Title */}
      <div className="admin-form-field">
        <label htmlFor="title" className="admin-label">
          Title <span className="admin-label__required">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={values?.title ?? ""}
          placeholder="Morning Grounding"
          className="admin-input"
        />
      </div>

      {/* Excerpt */}
      <div className="admin-form-field">
        <label htmlFor="excerpt" className="admin-label">
          Excerpt
        </label>
        <input
          id="excerpt"
          name="excerpt"
          type="text"
          defaultValue={values?.excerpt ?? ""}
          placeholder="Short pull-quote shown on the Today card"
          className="admin-input"
        />
        <p className="admin-hint">Optional — shown beneath the title on Today cards</p>
      </div>

      {/* Description */}
      <div className="admin-form-field">
        <label htmlFor="description" className="admin-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={values?.description ?? ""}
          placeholder="Longer context or framing…"
          className="admin-textarea admin-textarea--no-resize"
        />
      </div>

      {/* Status */}
      <div className="admin-form-field">
        <label htmlFor="status" className="admin-label">
          Status <span className="admin-label__required">*</span>
        </label>
        <select
          id="status"
          name="status"
          defaultValue={values?.status ?? "draft"}
          className="admin-select"
        >
          <option value="draft">Draft — not visible to members</option>
          <option value="ready_for_review">Ready for review</option>
          <option value="published">Published — live on Today</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* ─── Tier & scheduling (Sprint 10) ──────────────────────────────── */}
      <div className="admin-form-section">
        <p className="admin-form-section__label">Access &amp; scheduling</p>

        {/* Tier min */}
        <div className="admin-form-field">
          <label htmlFor="tier_min" className="admin-label">
            Minimum tier
          </label>
          <select
            id="tier_min"
            name="tier_min"
            defaultValue={values?.tier_min ?? ""}
            className="admin-select"
          >
            <option value="">All tiers (no restriction)</option>
            <option value="level_1">Level 1+</option>
            <option value="level_2">Level 2+</option>
            <option value="level_3">Level 3+ (default for coaching)</option>
            <option value="level_4">Level 4 only</option>
          </select>
          <p className="admin-hint">
            Members below this tier will not see this content in library or search.
          </p>
        </div>

        {/* starts_at — relevant for coaching calls and future events */}
        {(isCoaching || !!values?.starts_at) && (
          <div className="admin-form-field">
            <label htmlFor="starts_at" className="admin-label">
              Call date &amp; time
            </label>
            <input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              defaultValue={startsAtLocal}
              className="admin-input"
            />
            <p className="admin-hint">
              When the live call happens. Leave blank for replays with no scheduled time.
            </p>
          </div>
        )}
      </div>

      {/* ─── Publishing date ─────────────────────────────────────────────── */}
      <div className="admin-form-section">
        <p className="admin-form-section__label">Publishing date</p>

        {isDaily && (
          <div className="admin-form-field">
            <label htmlFor="publish_date" className="admin-label">
              Publish date (Eastern)
            </label>
            <input
              id="publish_date"
              name="publish_date"
              type="date"
              defaultValue={values?.publish_date ?? dateDefaults?.publish_date ?? todayEastern}
              className="admin-input"
            />
            <p className="admin-hint">Members see this practice on this date (Eastern timezone)</p>
          </div>
        )}

        {isWeekly && (
          <div className="admin-form-field">
            <label htmlFor="week_start" className="admin-label">
              Week start date (Monday)
            </label>
            <input
              id="week_start"
              name="week_start"
              type="date"
              defaultValue={values?.week_start ?? dateDefaults?.week_start ?? ""}
              className="admin-input"
            />
            <p className="admin-hint">Active for the full 7-day week starting on this Monday</p>
          </div>
        )}

        {isMonthly && (
          <div className="admin-form-field">
            <label htmlFor="month_year" className="admin-label">
              Month (YYYY-MM)
            </label>
            <input
              id="month_year"
              name="month_year"
              type="month"
              defaultValue={values?.month_year ?? dateDefaults?.month_year ?? ""}
              className="admin-input"
            />
            <p className="admin-hint">Active during the entire calendar month</p>
          </div>
        )}
      </div>

      {/* ─── Content body ────────────────────────────────────────────────── */}
      <div className="admin-form-section">
        <p className="admin-form-section__label">Content body</p>

        <div className="admin-form-field">
          <label htmlFor="body" className="admin-label">
            Body / supporting notes
          </label>
          <BodyEditor
            defaultValue={values?.body ?? ""}
            placeholder="Write body content… Headings, bold, lists, and links supported."
          />
          <p className="admin-hint">
            Shown below the excerpt on Weekly/Monthly cards. Saves as Markdown.
          </p>
        </div>

        <div className="admin-form-field">
          <label htmlFor="reflection_prompt" className="admin-label">
            Reflection prompt
          </label>
          <input
            id="reflection_prompt"
            name="reflection_prompt"
            type="text"
            defaultValue={values?.reflection_prompt ?? ""}
            placeholder="What does this practice bring up for you today?"
            className="admin-input"
          />
          <p className="admin-hint">
            Shown above the &ldquo;Reflect&rdquo; button to guide member journaling
          </p>
        </div>
      </div>

      {/* ─── Media ───────────────────────────────────────────────────────── */}

      {/* Daily: explicit Castos + S3 fields */}
      {isDaily && (
        <div className="admin-form-section">
          <p className="admin-form-section__label">Audio (Daily)</p>

          <div className="admin-form-grid-2">
            <div className="admin-form-field">
              <label htmlFor="duration_seconds" className="admin-label">
                Duration (seconds)
              </label>
              <input
                id="duration_seconds"
                name="duration_seconds"
                type="number"
                min="0"
                step="1"
                defaultValue={values?.duration_seconds ?? ""}
                placeholder="480"
                className="admin-input"
              />
              <p className="admin-hint">e.g. 480 = 8 min</p>
            </div>
            <div />
          </div>

          <div className="admin-form-field">
            <label htmlFor="castos_episode_url" className="admin-label">
              Castos episode URL
            </label>
            <input
              id="castos_episode_url"
              name="castos_episode_url"
              type="url"
              defaultValue={values?.castos_episode_url ?? ""}
              placeholder="https://feeds.castos.com/…/episode.mp3"
              className="admin-input"
            />
          </div>

          <div className="admin-form-field">
            <label htmlFor="s3_audio_key" className="admin-label">
              S3 object key
            </label>
            <input
              id="s3_audio_key"
              name="s3_audio_key"
              type="text"
              defaultValue={values?.s3_audio_key ?? ""}
              placeholder="audio/daily/2026-04-01-morning-grounding.mp3"
              className="admin-input"
            />
          </div>
        </div>
      )}

      {/* Coaching: Zoom join URL + optional replay video */}
      {isCoaching && (
        <div className="admin-form-section">
          <p className="admin-form-section__label">Coaching (call details)</p>

          <div className="admin-form-field">
            <label htmlFor="join_url" className="admin-label">
              Zoom join URL
            </label>
            <input
              id="join_url"
              name="join_url"
              type="url"
              defaultValue={values?.join_url ?? ""}
              placeholder="https://us02web.zoom.us/j/…"
              className="admin-input"
            />
            <p className="admin-hint">Server-side only. Never exposed in client JS.</p>
          </div>

          <div className="admin-form-field">
            <label htmlFor="media_url" className="admin-label">
              Replay video URL (after call)
            </label>
            <input
              id="media_url"
              name="media_url"
              type="url"
              defaultValue={reconstructMediaUrl(values)}
              placeholder="Paste Vimeo or YouTube URL after the call"
              className="admin-input"
            />
            <p className="admin-hint">Auto-detected: Vimeo or YouTube. Add after the call ends.</p>
          </div>

          <div className="admin-form-field">
            <label htmlFor="duration_seconds" className="admin-label">
              Duration (seconds)
            </label>
            <input
              id="duration_seconds"
              name="duration_seconds"
              type="number"
              min="0"
              step="1"
              defaultValue={values?.duration_seconds ?? ""}
              placeholder="e.g. 3600 = 60 min"
              className="admin-input"
            />
          </div>
        </div>
      )}

      {/* Weekly/Monthly: single media URL with auto-detect */}
      {(isWeekly || isMonthly) && (
        <div className="admin-form-section">
          <p className="admin-form-section__label">Media (optional)</p>

          <div className="admin-form-field">
            <label htmlFor="media_url" className="admin-label">
              Media URL
            </label>
            <input
              id="media_url"
              name="media_url"
              type="url"
              defaultValue={reconstructMediaUrl(values)}
              placeholder="Paste a Vimeo, YouTube, or audio URL…"
              className="admin-input"
            />
            <p className="admin-hint">
              Auto-detected: Vimeo, YouTube, Castos, or direct audio (.mp3, .m4a).
              Leave empty for text-only content.
            </p>
          </div>

          <div className="admin-form-field">
            <label htmlFor="duration_seconds" className="admin-label">
              Duration (seconds)
            </label>
            <input
              id="duration_seconds"
              name="duration_seconds"
              type="number"
              min="0"
              step="1"
              defaultValue={values?.duration_seconds ?? ""}
              placeholder="Optional — for audio/video length"
              className="admin-input"
            />
          </div>
        </div>
      )}

      {/* ─── Downloads & links ───────────────────────────────────────────── */}
      <div className="admin-form-section">
        <p className="admin-form-section__label">Downloads &amp; links</p>

        <div className="admin-form-field">
          <label htmlFor="download_url" className="admin-label">
            Download URL
          </label>
          <input
            id="download_url"
            name="download_url"
            type="url"
            defaultValue={values?.download_url ?? ""}
            placeholder="https://… (PDF, worksheet, or other resource)"
            className="admin-input"
          />
          <p className="admin-hint">Optional — shown as a download link on the Today card</p>
        </div>

        <div className="admin-form-field">
          <label className="admin-label">Resource links</label>
          <p className="admin-hint" style={{ marginBottom: "0.375rem" }}>
            Additional links shown beneath the content (e.g. articles, tools, worksheets).
          </p>
          <ResourceLinksEditor initialValue={values?.resource_links} />
        </div>
      </div>

      {/* ─── Internal ────────────────────────────────────────────────────── */}
      <div className="admin-form-field">
        <label htmlFor="admin_notes" className="admin-label">
          Admin notes
        </label>
        <textarea
          id="admin_notes"
          name="admin_notes"
          rows={2}
          defaultValue={values?.admin_notes ?? ""}
          placeholder="Internal notes — never shown to members"
          className="admin-textarea admin-textarea--no-resize"
        />
      </div>

      {/* Actions */}
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn--primary">
          {submitLabel}
        </button>
        <Link href="/admin/content" className="admin-btn admin-btn--outline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
