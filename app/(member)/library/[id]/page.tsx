import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { getLibraryItem } from "@/lib/queries/get-library-item";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
import { getNoteForContent } from "@/app/(member)/notes/actions";
import { MarkdownBody } from "@/components/content/MarkdownBody";
import { TypeBadge } from "@/components/member/TypeBadge";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { ResourceLinks } from "@/components/media/ResourceLinks";
import { LibraryReflectSection } from "@/components/library/LibraryReflectSection";
import { AudioPlayer } from "@/components/today/AudioPlayer";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

/**
 * app/(member)/library/[id]/page.tsx
 * Sprint 11b: Full content detail page for a library item.
 *
 * Server component. Requires active membership.
 * Enforces tier_min via checkTierAccess.
 * Renders: title, type badge, date context, excerpt, full body (MarkdownBody),
 *          video embed (Vimeo/YouTube), resource links, reflection prompt,
 *          Reflect action with NoteSheet.
 */

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await getLibraryItem(id);
  if (!item) return { title: "Not Found — Positives" };
  return {
    title: `${item.title} — Positives`,
    description: item.excerpt ?? item.description ?? undefined,
  };
}

/** Returns a human-readable date context string for the library item */
function getDateContext(item: {
  type: string;
  publish_date: string | null;
  week_start: string | null;
  month_year: string | null;
}): string | null {
  if (item.type === "monthly_theme" && item.month_year) {
    // month_year is "YYYY-MM" format
    const [year, month] = item.month_year.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
  }
  if (item.type === "weekly_principle" && item.week_start) {
    const date = new Date(item.week_start + "T12:00:00");
    return `Week of ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date)}`;
  }
  if (item.publish_date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(item.publish_date));
  }
  return null;
}

function accentClassForType(type: string): string {
  if (type === "weekly_principle") return "text-secondary hover:text-secondary-hover";
  if (type === "monthly_theme") return "text-accent hover:text-accent-hover";
  return "text-primary hover:text-primary-hover";
}

export default async function LibraryItemPage({ params }: Props) {
  const { id } = await params;

  // Auth guard — redirects to /login or /join if not active
  const member = await requireActiveMember();

  // Fetch content
  const item = await getLibraryItem(id);

  // Not found or not published
  if (!item || item.status !== "published") {
    notFound();
  }

  // Tier access enforcement
  if (!checkTierAccess(member.subscription_tier, item.tier_min)) {
    notFound();
  }

  // Check existing note (server-side to avoid flash)
  const existingNote = await getNoteForContent(id);
  const hasNote = !!existingNote;

  const hasVideo = !!(item.vimeo_video_id || item.youtube_video_id);
  const hasBody = !!(item.body || item.description);
  const bodyContent = item.body || item.description || "";
  const dateContext = getDateContext(item);
  const accentClass = accentClassForType(item.type);
  const audioUrl = await resolveAudioUrl(item.castos_episode_url, item.s3_audio_key);
  const audioDuration =
    item.duration_seconds != null
      ? `${Math.floor(item.duration_seconds / 60)}:${String(item.duration_seconds % 60).padStart(2, "0")}`
      : "—";

  return (
    <div className="member-container py-8 md:py-12">
      {/* ── Back navigation ───────────────────────────────────────────────── */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Library</span>
      </Link>

      <article className="space-y-6">
        {/* ── Meta row ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <TypeBadge type={item.type} />
          {dateContext && (
            <span className="text-xs text-muted-foreground">{dateContext}</span>
          )}
        </div>

        {/* ── Title ─────────────────────────────────────────────────────────── */}
        <h1 className="heading-balance font-heading font-bold text-2xl md:text-3xl text-foreground leading-heading tracking-[-0.03em] mb-3">
          {item.title}
        </h1>

        {/* ── Excerpt / subtitle ────────────────────────────────────────────── */}
        {item.excerpt && (
          <p className="text-base text-foreground/65 leading-relaxed mb-6">
            {item.excerpt}
          </p>
        )}

        {/* ── Video embed ───────────────────────────────────────────────────── */}
        {hasVideo && (
          <div className="overflow-hidden rounded-2xl border border-border">
            <VideoEmbed
              vimeoId={item.vimeo_video_id}
              youtubeId={item.youtube_video_id}
              contentId={item.id}
              title={item.title}
            />
          </div>
        )}

        {audioUrl && (
          <SurfaceCard elevated>
            <p className="ui-section-eyebrow mb-3">Listen</p>
            <AudioPlayer
              trackId={item.id}
              src={audioUrl}
              title={item.title}
              subtitle={item.type === "daily_audio" ? "Daily Practice" : "Library Audio"}
              duration={audioDuration}
              tone="light"
              onCompleteContentId={item.type === "daily_audio" ? item.id : undefined}
            />
          </SurfaceCard>
        )}

        {hasBody && (
          <SurfaceCard padding="lg" elevated>
            <MarkdownBody content={bodyContent} />
          </SurfaceCard>
        )}

        {/* ── Resource links ────────────────────────────────────────────────── */}
        {(item.download_url || item.resource_links) && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Resources
            </p>
            <ResourceLinks
              downloadUrl={item.download_url}
              resourceLinks={item.resource_links}
              accentClass={accentClass}
            />
          </div>
        )}

        {/* ── Reflect section ───────────────────────────────────────────────── */}
        <SurfaceCard tone="tint" padding="lg">
          <LibraryReflectSection
            contentId={item.id}
            contentTitle={item.title}
            reflectionPrompt={item.reflection_prompt}
            initialHasNote={hasNote}
          />
        </SurfaceCard>
      </article>
    </div>
  );
}
