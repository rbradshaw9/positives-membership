import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateContent } from "@/app/admin/content/actions";
import { ContentForm } from "@/app/admin/content/new/page";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import { VideoUploadPanel } from "@/components/admin/VideoUploadPanel";

export const metadata = {
  title: "Edit Practice Content — Positives Admin",
};

type Props = {
  params: Promise<{ id: string; contentId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function MonthContentEditPage({ params, searchParams }: Props) {
  const { id: monthId, contentId } = await params;
  const { error: errorParam } = await searchParams;
  const todayEastern = getEffectiveDate();
  const returnTo = `/admin/months/${monthId}`;

  const supabase = await createClient();
  const [{ data: month }, { data: row, error }] = await Promise.all([
    supabase
      .from("monthly_practice")
      .select("id, label, month_year")
      .eq("id", monthId)
      .single(),
    supabase
      .from("content")
      .select(
        "id, monthly_practice_id, type, title, excerpt, description, featured_image_url, thumbnail_image_url, body, reflection_prompt, download_url, resource_links, status, publish_date, week_start, month_year, duration_seconds, castos_episode_url, s3_audio_key, vimeo_video_id, youtube_video_id, admin_notes, tier_min, starts_at, join_url, send_reminders, send_replay_email"
      )
      .eq("id", contentId)
      .single(),
  ]);

  if (error || !row || !month || row.monthly_practice_id !== monthId) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <div className="admin-breadcrumb">
        <Link href={returnTo} className="admin-breadcrumb__back">
          ← {month.label}
        </Link>
        <Link
          href="/today"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-breadcrumb__action"
        >
          Preview Today ↗
        </Link>
      </div>

      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Practice Content</p>
        <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>
          Edit {row.title}
        </h1>
        <p className="admin-page-header__subtitle">
          This is managed inside {month.label}, the single workspace for daily, weekly, and
          monthly practice content.
        </p>
      </div>

      {errorParam && (
        <div className="admin-banner admin-banner--error">
          {errorParam === "title_required"
            ? "Title is required."
            : "Failed to save. Check server logs."}
        </div>
      )}

      <ContentForm
        action={updateContent}
        defaultType={row.type}
        todayEastern={todayEastern}
        submitLabel="Save practice content"
        returnTo={returnTo}
        cancelHref={returnTo}
        values={{
          id: row.id,
          type: row.type,
          title: row.title,
          excerpt: row.excerpt ?? "",
          description: row.description ?? "",
          featured_image_url: row.featured_image_url,
          thumbnail_image_url: row.thumbnail_image_url,
          body: row.body,
          reflection_prompt: row.reflection_prompt,
          download_url: row.download_url,
          resource_links: row.resource_links as unknown as Array<{ label: string; url: string }> | null,
          status: row.status,
          publish_date: row.publish_date,
          week_start: row.week_start,
          month_year: row.month_year,
          duration_seconds: row.duration_seconds,
          castos_episode_url: row.castos_episode_url,
          s3_audio_key: row.s3_audio_key,
          vimeo_video_id: row.vimeo_video_id,
          youtube_video_id: row.youtube_video_id,
          admin_notes: row.admin_notes,
          tier_min: row.tier_min,
          starts_at: row.starts_at,
          join_url: row.join_url,
          send_reminders: row.send_reminders,
          send_replay_email: row.send_replay_email,
        }}
      />

      {row.type !== "daily_audio" && (
        <div className="admin-form-card" style={{ marginTop: "1rem" }}>
          <VideoUploadPanel
            contentId={row.id}
            currentVimeoId={row.vimeo_video_id ?? null}
            contentTitle={row.title}
            contentType={row.type}
          />
        </div>
      )}
    </div>
  );
}
