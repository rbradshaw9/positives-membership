import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMonthDetail } from "@/lib/queries/get-monthly-archive";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import Link from "next/link";
import type { Metadata } from "next";

/**
 * app/(member)/library/months/[monthYear]/page.tsx
 *
 * Month detail page — shows monthly theme video, weekly principles list,
 * and daily practice count for a specific past month.
 */

interface Props {
  params: Promise<{ monthYear: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { monthYear } = await params;
  return {
    title: `${monthYear} — Positives Library`,
  };
}

export default async function MonthDetailPage({ params }: Props) {
  const { monthYear } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("member")
    .select("id, subscription_status")
    .eq("id", user.id)
    .single();

  if (!member || member.subscription_status !== "active") redirect("/account");

  const detail = await getMonthDetail(monthYear);

  if (!detail) notFound();

  const { practice, theme, weekly_content, daily_count } = detail;

  return (
    <main className="member-container py-8 md:py-12">
      {/* ── Back ─────────────────────────────────────────────────────── */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Library
      </Link>

      <div className="flex flex-col gap-10">
        {/* ── Month header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-primary)" }}>
            Monthly Archive
          </p>
          <h1 className="heading-balance font-heading font-bold text-3xl md:text-4xl text-foreground tracking-tight">
            {practice.label}
          </h1>
          {practice.description && (
            <p className="text-foreground/70 text-base leading-relaxed max-w-2xl">
              {practice.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap mt-1">
            {daily_count > 0 && <span>{daily_count} daily practices</span>}
            {weekly_content.length > 0 && <span>· {weekly_content.length} weekly principles</span>}
            {theme && <span>· Monthly theme</span>}
          </div>
        </div>

        {/* ── Monthly theme ─────────────────────────────────────────────── */}
        {theme && (
          <section aria-labelledby="theme-heading" className="flex flex-col gap-5">
            <h2 id="theme-heading" className="font-heading font-semibold text-xl text-foreground">
              Monthly Theme
            </h2>
            <h3 className="font-heading font-bold text-lg text-foreground">{theme.title}</h3>

            {(theme.vimeo_video_id || theme.youtube_video_id) && (
              <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                <VideoEmbed
                  vimeoId={theme.vimeo_video_id}
                  youtubeId={theme.youtube_video_id}
                  contentId={theme.id}
                  title={theme.title}
                />
              </div>
            )}

            {(theme.description || theme.body) && (
              <div className="text-foreground/75 leading-relaxed">
                {theme.body ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: theme.body }}
                  />
                ) : (
                  <p>{theme.description}</p>
                )}
              </div>
            )}

            {theme.reflection_prompt && (
              <div
                className="p-5 rounded-2xl border-l-4"
                style={{
                  borderLeftColor: "var(--color-primary)",
                  background: "color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))",
                  borderColor: "color-mix(in srgb, var(--color-primary) 15%, var(--color-border))",
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-primary)" }}>
                  Reflection
                </p>
                <p className="text-foreground/80 leading-relaxed italic">{theme.reflection_prompt}</p>
              </div>
            )}
          </section>
        )}

        {/* ── Weekly principles ──────────────────────────────────────── */}
        {weekly_content.length > 0 && (
          <section aria-labelledby="weekly-heading" className="flex flex-col gap-4">
            <h2 id="weekly-heading" className="font-heading font-semibold text-xl text-foreground">
              Weekly Principles
            </h2>
            <div className="flex flex-col gap-2">
              {weekly_content.map((week, i) => (
                <Link
                  key={week.id}
                  href={`/library/${week.id}`}
                  className="group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface, #fff)" }}
                >
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                      color: "var(--color-primary)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {week.title}
                    </p>
                    {week.excerpt && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{week.excerpt}</p>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Daily practices note ───────────────────────────────────── */}
        {daily_count > 0 && (
          <section>
            <div
              className="flex items-center gap-4 p-5 rounded-2xl border"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface, #fff)" }}
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{ color: "var(--color-primary)" }} aria-hidden="true">
                  <path d="M9 19V6l12-3v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="15" r="3" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {daily_count} Daily Practice{daily_count !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Daily audios from {practice.label} are available in the Today page.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
