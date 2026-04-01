import { requireActiveMember } from "@/lib/auth/require-active-member";
import {
  getLibraryContent,
  getMemberNoteContentIds,
  type ContentTypeFilter,
  type LibraryItem,
} from "@/lib/queries/get-library-content";
import { LibraryList } from "@/components/library/LibraryList";

/**
 * app/(member)/library/page.tsx
 * Content archive — all published Daily, Weekly, and Monthly content.
 *
 * Filter tabs: All · Daily · Weekly · Monthly
 * Implemented via search params (?tab=daily_audio etc.) — no client state,
 * no JavaScript required for filtering, works as SSR.
 *
 * Shows note indicator for content items the member has reflected on.
 */

export const metadata = {
  title: "Library — Positives",
  description: "Your full archive of daily practices, weekly principles, and monthly themes.",
};

type SearchParams = Promise<{ tab?: string; page?: string }>;

const PAGE_SIZE = 20;

function parseTab(tab: string | undefined): ContentTypeFilter {
  if (tab === "daily") return "daily_audio";
  if (tab === "weekly") return "weekly_principle";
  if (tab === "monthly") return "monthly_theme";
  return null;
}

const TAB_LABELS: { key: string; label: string; value: ContentTypeFilter }[] = [
  { key: "all", label: "All", value: null },
  { key: "daily", label: "Daily", value: "daily_audio" },
  { key: "weekly", label: "Weekly", value: "weekly_principle" },
  { key: "monthly", label: "Monthly", value: "monthly_theme" },
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
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(item.publish_date + "T12:00:00")); // noon to avoid TZ shift
  }
  if (item.week_start) {
    return `Week of ${new Intl.DateTimeFormat("en-US", {
      month: "long",
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

  const member = await requireActiveMember();

  const [content, noteContentIds] = await Promise.all([
    getLibraryContent(typeFilter, PAGE_SIZE + 1, offset), // fetch one extra to detect hasMore
    getMemberNoteContentIds(member.id),
  ]);

  const hasMore = content.length > PAGE_SIZE;
  const pageItems = content.slice(0, PAGE_SIZE);

  const enriched = pageItems.map((item) => ({
    ...item,
    typeLabel: typeLabel(item.type),
    dateContext: dateContext(item),
    hasNote: noteContentIds.has(item.id),
  }));

  return (
    <div className="px-5 py-8 max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          Library
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your archive of practices, principles, and themes.
        </p>
      </header>

      {/* Filter tabs — URL-driven, no JS required */}
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

      {enriched.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">
            {page > 1 ? "No more content on this page." : "No content here yet — check back soon."}
          </p>
        </div>
      ) : (
        <LibraryList items={enriched} />
      )}

      {/* Pagination */}
      {(page > 1 || hasMore) && (
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
