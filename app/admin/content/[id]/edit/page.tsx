import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateContent } from "../../actions";
import { ContentForm } from "../../new/page";
import { getEffectiveDate } from "@/lib/dates/effective-date";

/**
 * app/admin/content/[id]/edit/page.tsx
 * Edit an existing content record.
 * Sprint 5 — passes richer fields (body, reflection_prompt, download_url,
 * vimeo_video_id, youtube_video_id) to the ContentForm.
 */

export const metadata = {
  title: "Edit Content — Positives Admin",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminContentEditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;
  const todayEastern = getEffectiveDate();

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("content")
    .select(
      "id, type, title, excerpt, description, body, reflection_prompt, download_url, resource_links, status, publish_date, week_start, month_year, duration_seconds, castos_episode_url, s3_audio_key, vimeo_video_id, youtube_video_id, admin_notes, tier_min, starts_at, join_url"
    )
    .eq("id", id)
    .single();

  if (error || !row) notFound();

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/admin/content"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
        >
          ← Back to content
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-1">
              Edit content
            </h1>
            <p className="text-muted-foreground text-sm line-clamp-1">{row.title}</p>
          </div>
          <Link
            href="/today"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-1"
          >
            Preview Today ↗
          </Link>
        </div>
      </div>

      {errorParam && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-4 mb-6">
          {errorParam === "title_required"
            ? "Title is required."
            : "Failed to save. Check server logs."}
        </div>
      )}

      <ContentForm
        action={updateContent}
        defaultType={row.type}
        todayEastern={todayEastern}
        submitLabel="Save changes"
        values={{
          id: row.id,
          type: row.type,
          title: row.title,
          excerpt: row.excerpt ?? "",
          description: row.description ?? "",
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
        }}
      />
    </div>
  );
}
