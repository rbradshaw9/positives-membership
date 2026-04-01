import Link from "next/link";
import { createContent } from "../actions";
import { getEffectiveDate } from "@/lib/dates/effective-date";

/**
 * app/admin/content/new/page.tsx
 * Create a new content record (Daily / Weekly / Monthly).
 * Sprint 5 — richer content fields + media URL auto-detect.
 */

export const metadata = {
  title: "New Content — Positives Admin",
};

type SearchParams = Promise<{ error?: string; type?: string }>;

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
      <div className="mb-6">
        <Link
          href="/admin/content"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
        >
          ← Back to content
        </Link>
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-1">
          New content
        </h1>
        <p className="text-muted-foreground text-sm">
          Create a Daily, Weekly, or Monthly content record.
        </p>
      </div>

      {params.error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-4 mb-6">
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
}: {
  action: (formData: FormData) => Promise<void>;
  defaultType: string;
  todayEastern: string;
  submitLabel: string;
  values?: ContentFormValues;
}) {
  const type = values?.type ?? defaultType;
  const isDaily = type === "daily_audio";
  const isWeekly = type === "weekly_principle";
  const isMonthly = type === "monthly_theme";

  return (
    <form
      action={action}
      className="bg-card border border-border rounded-lg p-6 flex flex-col gap-5"
    >
      {values?.id && <input type="hidden" name="id" value={values.id} />}

      {/* ─── Core ────────────────────────────────────────────────────────── */}

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-medium text-foreground">
          Content type <span className="text-destructive">*</span>
        </label>
        <select
          id="type"
          name="type"
          defaultValue={type}
          className="admin-input"
        >
          <option value="daily_audio">Daily — audio practice</option>
          <option value="weekly_principle">Weekly — principle</option>
          <option value="monthly_theme">Monthly — theme</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Determines which Today card this appears in
        </p>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Title <span className="text-destructive">*</span>
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="excerpt" className="text-sm font-medium text-foreground">
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
        <p className="text-xs text-muted-foreground">
          Optional — shown beneath the title on Today cards
        </p>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={values?.description ?? ""}
          placeholder="Longer context or framing…"
          className="admin-input resize-none"
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-sm font-medium text-foreground">
          Status <span className="text-destructive">*</span>
        </label>
        <select
          id="status"
          name="status"
          defaultValue={values?.status ?? "draft"}
          className="admin-input"
        >
          <option value="draft">Draft — not visible to members</option>
          <option value="ready_for_review">Ready for review</option>
          <option value="published">Published — live on Today</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* ─── Publishing date ─────────────────────────────────────────────── */}
      <div className="border-t border-border pt-4 flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Publishing date
        </p>

        {isDaily && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="publish_date" className="text-sm font-medium text-foreground">
              Publish date (Eastern)
            </label>
            <input
              id="publish_date"
              name="publish_date"
              type="date"
              defaultValue={values?.publish_date ?? todayEastern}
              className="admin-input"
            />
            <p className="text-xs text-muted-foreground">
              Members see this practice on this date (Eastern timezone)
            </p>
          </div>
        )}

        {isWeekly && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="week_start" className="text-sm font-medium text-foreground">
              Week start date (Monday)
            </label>
            <input
              id="week_start"
              name="week_start"
              type="date"
              defaultValue={values?.week_start ?? ""}
              className="admin-input"
            />
            <p className="text-xs text-muted-foreground">
              Active for the full 7-day week starting on this Monday
            </p>
          </div>
        )}

        {isMonthly && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="month_year" className="text-sm font-medium text-foreground">
              Month (YYYY-MM)
            </label>
            <input
              id="month_year"
              name="month_year"
              type="month"
              defaultValue={values?.month_year ?? ""}
              className="admin-input"
            />
            <p className="text-xs text-muted-foreground">
              Active during the entire calendar month
            </p>
          </div>
        )}
      </div>

      {/* ─── Content body ────────────────────────────────────────────────── */}
      <div className="border-t border-border pt-4 flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Content body
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="body" className="text-sm font-medium text-foreground">
            Body / supporting notes
          </label>
          <textarea
            id="body"
            name="body"
            rows={6}
            defaultValue={values?.body ?? ""}
            placeholder="Markdown-supported. Supporting text shown to members on the Today card and in the Library."
            className="admin-input resize-none font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Shown below the excerpt on Weekly/Monthly cards. Supports Markdown.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reflection_prompt" className="text-sm font-medium text-foreground">
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
          <p className="text-xs text-muted-foreground">
            Shown above the &ldquo;Reflect&rdquo; button to guide member journaling
          </p>
        </div>
      </div>

      {/* ─── Media ───────────────────────────────────────────────────────── */}

      {/* Daily: explicit Castos + S3 fields */}
      {isDaily && (
        <div className="border-t border-border pt-4 flex flex-col gap-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Audio (Daily)
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="duration_seconds" className="text-sm font-medium text-foreground">
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
              <p className="text-xs text-muted-foreground">e.g. 480 = 8 min</p>
            </div>
            <div />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="castos_episode_url" className="text-sm font-medium text-foreground">
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="s3_audio_key" className="text-sm font-medium text-foreground">
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

      {/* Weekly/Monthly: single media URL with auto-detect */}
      {(isWeekly || isMonthly) && (
        <div className="border-t border-border pt-4 flex flex-col gap-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Media (optional)
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="media_url" className="text-sm font-medium text-foreground">
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
            <p className="text-xs text-muted-foreground">
              Auto-detected: Vimeo, YouTube, Castos, or direct audio (.mp3, .m4a).
              Leave empty for text-only content.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="duration_seconds" className="text-sm font-medium text-foreground">
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
      <div className="border-t border-border pt-4 flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Downloads &amp; links
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="download_url" className="text-sm font-medium text-foreground">
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
          <p className="text-xs text-muted-foreground">
            Optional — shown as a download link on the Today card
          </p>
        </div>
      </div>

      {/* ─── Internal ────────────────────────────────────────────────────── */}
      <div className="border-t border-border pt-4 flex flex-col gap-1.5">
        <label htmlFor="admin_notes" className="text-sm font-medium text-foreground">
          Admin notes
        </label>
        <textarea
          id="admin_notes"
          name="admin_notes"
          rows={2}
          defaultValue={values?.admin_notes ?? ""}
          placeholder="Internal notes — never shown to members"
          className="admin-input resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
        >
          {submitLabel}
        </button>
        <Link
          href="/admin/content"
          className="px-4 py-2.5 rounded border border-border text-muted-foreground font-medium text-sm hover:text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
