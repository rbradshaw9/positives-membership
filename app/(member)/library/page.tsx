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
import { EmptyState } from "@/components/member/EmptyState";

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
    const searchResults = await searchLibraryContent(searchQuery, PAGE_SIZE);
    content = searchResults.map((r) => ({
      id: r.id,
      type: r.type as LibraryItem["type"],
      title: r.title,
      excerpt: r.excerpt,
      description: r.description,
      download_url: null,
      resource_links: null,
      publish_date: r.publish_date,
      week_start: r.week_start,
      month_year: r.month_year,
      duration_seconds: r.duration_seconds,
    }));
  } else {
    content = await getLibraryContent(typeFilter, PAGE_SIZE + 1, offset);
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
    <div className="px-5 pt-10 pb-4 max-w-2xl mx-auto">
      <PageHeader
        title="Library"
        subtitle="Your archive of practices, principles, and themes."
      />

      {/* Search bar */}
      <form action="/library" method="GET" className="mb-5">
        {/* Preserve tab when searching */}
        {activeTab !== "all" && (
          <input type="hidden" name="tab" value={activeTab} />
        )}
        <div className="relative">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            id="library-search"
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search practices, principles, themes…"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors"
            aria-label="Search library content"
            autoComplete="off"
          />
          {/* Clear ×  button — only visible when there's a query */}
          {isSearchMode && (
            <a
              href={clearHref}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
            </a>
          )}
        </div>

        {/* Result count row */}
        {isSearchMode && (
          <p className="text-xs text-muted-foreground mt-2">
            {enriched.length === 0
              ? "No results"
              : enriched.length === 1
                ? "1 result"
                : `${enriched.length} results`}{" "}
            for &ldquo;<span className="text-foreground font-medium">{searchQuery}</span>&rdquo;
          </p>
        )}
      </form>

      {/* Filter tabs — hidden during search */}
      {!isSearchMode && (
        <nav
          aria-label="Content filter"
          className="flex gap-1 mb-6 bg-muted p-1 rounded-xl"
        >
          {TAB_LABELS.map(({ key, label }) => (
            <a
              key={key}
              href={key === "all" ? "/library" : `/library?tab=${key}`}
              className={[
                "flex-1 text-center text-sm font-medium py-2 rounded-lg transition-colors",
                activeTab === key
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              aria-current={activeTab === key ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      )}

      {/* Results or empty state */}
      {enriched.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
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
                  <a href={clearHref} className="text-primary hover:underline">
                    browse all content
                  </a>
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

      {/* Pagination — browse mode only */}
      {!isSearchMode && (page > 1 || hasMore) && (
        <nav
          aria-label="Library pagination"
          className="flex items-center justify-between mt-4 pt-4 border-t border-border"
        >
          {page > 1 ? (
            <a
              href={`/library${activeTab !== "all" ? `?tab=${activeTab}&page=${page - 1}` : `?page=${page - 1}`}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Newer
            </a>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">Page {page}</span>
          {hasMore ? (
            <a
              href={`/library${activeTab !== "all" ? `?tab=${activeTab}&page=${page + 1}` : `?page=${page + 1}`}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Older →
            </a>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
