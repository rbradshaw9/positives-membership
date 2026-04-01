import Form from "next/form";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import {
  getLibraryContent,
  getMemberNoteContentIds,
  type ContentTypeFilter,
  type LibraryItem,
} from "@/lib/queries/get-library-content";
import { searchLibraryContent } from "@/lib/queries/search-library-content";
import { LibraryList } from "@/components/library/LibraryList";
import { PageHeader } from "@/components/member/PageHeader";
import { FilterChip } from "@/components/ui/FilterChip";
import { SearchField } from "@/components/ui/SearchField";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";

/**
 * app/(member)/library/page.tsx
 * Sprint 7: wider container, PageHeader, EmptyState components.
 */

export const metadata = {
  title: "Library — Positives",
  description: "Your full archive of daily practices, weekly principles, and monthly themes.",
};

type SearchParams = Promise<{ tab?: string; page?: string; q?: string }>;

const PAGE_SIZE = 20;

function parseTab(tab: string | undefined): ContentTypeFilter {
  if (tab === "daily") return "daily_audio";
  if (tab === "weekly") return "weekly_principle";
  if (tab === "monthly") return "monthly_theme";
  return null;
}

const TAB_LABELS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

function typeLabel(type: LibraryItem["type"]): string {
  if (type === "daily_audio") return "Daily";
  if (type === "weekly_principle") return "Weekly";
  if (type === "monthly_theme") return "Monthly";
  return type;
}

function dateContext(item: LibraryItem): string | null {
  if (item.publish_date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(item.publish_date + "T12:00:00"));
  }
  if (item.week_start) {
    return `Week of ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(item.week_start + "T12:00:00"))}`;
  }
  if (item.month_year) {
    const [year, month] = item.month_year.split("-");
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
      new Date(parseInt(year), parseInt(month) - 1, 1)
    );
  }
  return null;
}

export default async function LibraryPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const activeTab = searchParams.tab ?? "all";
  const typeFilter = parseTab(activeTab);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;
  const searchQuery = searchParams.q?.trim() ?? "";
  const isSearchMode = searchQuery.length > 0;

  const member = await requireActiveMember();

  // Content fetch — FTS search or browse
  let content: LibraryItem[];
  if (isSearchMode) {
    const searchResults = await searchLibraryContent(searchQuery, PAGE_SIZE, member.subscription_tier);
    content = searchResults.map((r) => ({
      id: r.id,
      type: r.type as LibraryItem["type"],
      title: r.title,
      excerpt: r.excerpt,
      description: r.description,
      vimeo_video_id: r.vimeo_video_id,
      youtube_video_id: r.youtube_video_id,
      castos_episode_url: r.castos_episode_url,
      s3_audio_key: r.s3_audio_key,
      download_url: null,
      resource_links: null,
      publish_date: r.publish_date,
      week_start: r.week_start,
      month_year: r.month_year,
      duration_seconds: r.duration_seconds,
    }));
  } else {
    content = await getLibraryContent(typeFilter, PAGE_SIZE + 1, offset, member.subscription_tier);
  }

  const noteContentIds = await getMemberNoteContentIds(member.id);

  const hasMore = !isSearchMode && content.length > PAGE_SIZE;
  const pageItems = isSearchMode ? content : content.slice(0, PAGE_SIZE);

  const enriched = pageItems.map((item) => ({
    ...item,
    typeLabel: typeLabel(item.type),
    dateContext: dateContext(item),
    hasNote: noteContentIds.has(item.id),
  }));

  const clearHref = activeTab !== "all" ? `/library?tab=${activeTab}` : "/library";

  return (
    <div>
      <PageHeader
        title="Library"
        subtitle="A curated archive of daily grounding, weekly principles, monthly themes, and deeper library moments."
        hero
      />
      <div className="member-container py-8 md:py-10">
      <Form action="/library" className="mb-6" scroll={false}>
        {activeTab !== "all" && (
          <input type="hidden" name="tab" value={activeTab} />
        )}
        <SearchField
            id="library-search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search practices, principles, themes…"
            ariaLabel="Search library content"
            trailing={
              isSearchMode ? (
                <Link
                  href={clearHref}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Clear search"
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </Link>
              ) : null
            }
          />

        {isSearchMode && (
          <p className="mt-2 text-xs text-muted-foreground">
            {enriched.length === 0
              ? "No results"
              : enriched.length === 1
                ? "1 result"
              : `${enriched.length} results`}{" "}
            for &ldquo;<span className="font-medium text-foreground">{searchQuery}</span>&rdquo;
          </p>
        )}
      </Form>

      {!isSearchMode && (
        <nav aria-label="Content filter" className="mb-6 flex flex-wrap gap-2">
          {TAB_LABELS.map(({ key, label }) => (
            <FilterChip
              key={key}
              href={key === "all" ? "/library" : `/library?tab=${key}`}
              active={activeTab === key}
            >
              {label}
            </FilterChip>
          ))}
        </nav>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="surface-card surface-card--tint surface-card--editorial p-5">
          <p className="ui-section-eyebrow mb-2">Browse by Rhythm</p>
          <h2 className="heading-balance font-heading text-2xl font-semibold tracking-[-0.03em] text-foreground">
            A premium archive built around your daily, weekly, and monthly rhythm
          </h2>
          <p className="mt-2 text-sm leading-body text-muted-foreground">
            Search across the full archive, or head to My Practice when you want a more guided discovery flow.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <FilterChip href="/practice?tab=daily" active={false}>
              Daily
            </FilterChip>
            <FilterChip href="/practice?tab=weekly" active={false}>
              Weekly
            </FilterChip>
            <FilterChip href="/practice?tab=monthly" active={false}>
              Monthly
            </FilterChip>
          </div>
        </div>
        <SurfaceCard elevated className="surface-card--editorial flex h-full flex-col justify-between">
          <div>
            <p className="ui-section-eyebrow mb-2">This View</p>
            <p className="font-heading text-4xl font-bold tracking-[-0.04em] text-foreground">
              {enriched.length}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSearchMode ? "matching results" : "items in this slice of the archive"}
            </p>
          </div>
          <Button href="/practice" variant="outline" size="sm" className="mt-5 self-start">
            Open My Practice
          </Button>
        </SurfaceCard>
      </div>

      {enriched.length === 0 ? (
        <div className="surface-card py-16 text-center flex flex-col items-center gap-3">
          {isSearchMode ? (
            <>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground/50"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <div>
                <p className="text-foreground text-sm font-medium">Nothing matched</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Try different keywords, or{" "}
                  <Link href={clearHref} className="text-primary hover:underline">
                    browse all content
                  </Link>
                  .
                </p>
              </div>
            </>
          ) : page > 1 ? (
            <p className="text-muted-foreground text-sm">No more content on this page.</p>
          ) : (
            <p className="text-muted-foreground text-sm">No content here yet — check back soon.</p>
          )}
        </div>
      ) : (
        <LibraryList items={enriched} />
      )}

      {!isSearchMode && (page > 1 || hasMore) && (
        <nav
          aria-label="Library pagination"
          className="flex items-center justify-between mt-4 pt-4 border-t border-border"
        >
          {page > 1 ? (
            <Link
              href={`/library${activeTab !== "all" ? `?tab=${activeTab}&page=${page - 1}` : `?page=${page - 1}`}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              scroll={false}
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">Page {page}</span>
          {hasMore ? (
            <Link
              href={`/library${activeTab !== "all" ? `?tab=${activeTab}&page=${page + 1}` : `?page=${page + 1}`}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              scroll={false}
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      </div>
    </div>
  );
}
